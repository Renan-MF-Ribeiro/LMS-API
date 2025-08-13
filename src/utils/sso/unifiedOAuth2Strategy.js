const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const { Log } = require('../../components/logs/model');

class UnifiedOAuth2Strategy extends OAuth2Strategy {
    constructor(options, verify) {
        super(options, verify);

        this.name = options.name || 'unified-oauth2';
        this._userinfoURL = options.userInfoURL;
        this._strategyName = options.strategyName || this.name;
        this._tokenType = options.tokenType || 'Bearer';
        this._isOIDC = options.isOIDC || false;
        this._issuer = options.issuer;

        // Envolve métodos de log do fluxo
        this._wrapOAuth2Methods();

        // Envolve apenas getOAuthAccessToken (método real do passport-oauth2)
        if (!this._oauth2._getOAuthAccessTokenWrapped) {
            this._wrapGetOAuthAccessToken();
        }
    }

    async _log(type, message, route, data) {
        try {
            await Log.create({
                type,
                message,
                component: this._strategyName,
                route,
                dataNew: {
                    ...data,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (err) {
            console.error(`Error logging ${type}:`, err);
        }
    }

    _wrapOAuth2Methods() {
        // Salva uma referência ao método authenticate original
        this._originalAuthenticate = super.authenticate;
    }

    // Override do método authenticate preservando a herança correta
    authenticate(req, options) {
        // Faz o log assíncrono sem bloquear
        if (req.query?.error) {
            const logType = this._isOIDC ? 'OIDC_AUTH_ERROR' : 'OAUTH2_AUTH_ERROR';
            this._log(logType, logType, 'callback url', {
                error: req.query.error,
                errorDescription: req.query.error_description
            }).catch(err => console.error('Error logging auth event:', err));
        } else if (req.query?.code) {
            const logType = this._isOIDC ? 'OIDC_CALLBACK_RECEIVED' : 'OAUTH2_CALLBACK_RECEIVED';
            this._log(logType, logType, 'callback url', {
                hasCode: true,
                codePreview: req.query.code.substring(0, 10) + '...',
                hasState: !!req.query.state
            }).catch(err => console.error('Error logging auth event:', err));
        }

        // Chama o método da classe pai usando super
        return super.authenticate(req, options);
    }

    _wrapGetOAuthAccessToken() {
        const original = this._oauth2.getOAuthAccessToken.bind(this._oauth2);
        this._oauth2.getOAuthAccessToken = (code, params, callback) => {
            const startTime = Date.now();
            return original(code, params, async (err, accessToken, refreshToken, results) => {
                await this._handleTokenResponse(err, accessToken, refreshToken, results, startTime);
                callback(err, accessToken, refreshToken, results);
            });
        };
        this._oauth2._getOAuthAccessTokenWrapped = true;
    }

    async _handleTokenResponse(err, accessToken, refreshToken, results, startTime) {
        const duration = Date.now() - startTime;
        const logPrefix = this._isOIDC ? 'OIDC' : 'OAUTH2';

        if (err) {
            return this._log(`${logPrefix}_TOKEN_EXCHANGE_ERROR`, `${logPrefix}_TOKEN_EXCHANGE_ERROR`, 'accessToken url', {
                error: err.message || err.toString(),
                statusCode: err.statusCode,
                data: err.data,
                duration
            });
        }

        const logData = {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            tokenType: results?.token_type,
            expiresIn: results?.expires_in,
            scope: results?.scope,
            duration
        };

        if (this._isOIDC) logData.hasIdToken = !!results?.id_token;

        await this._log(`${logPrefix}_TOKEN_EXCHANGE_SUCCESS`, `${logPrefix}_TOKEN_EXCHANGE_SUCCESS`, 'accessToken url', logData);

        if (this._isOIDC) {
            if (results?.id_token) {
                this._lastIdToken = results.id_token;
                await this._processIdToken(results.id_token);
            } else {
                await this._log('OIDC_NO_ID_TOKEN', 'OIDC_NO_ID_TOKEN', 'accessToken url', {
                    resultsKeys: results ? Object.keys(results) : [],
                    results
                });
            }
        }
    }

    async _processIdToken(idToken) {
        try {
            const decoded = jwt.decode(idToken, { complete: true });
            await this._log('OIDC_ID_TOKEN_RECEIVED', 'OIDC_ID_TOKEN_RECEIVED', 'accessToken url', {
                algorithm: decoded?.header?.alg,
                issuer: decoded?.payload?.iss,
                subject: decoded?.payload?.sub,
                audience: decoded?.payload?.aud,
                expiresAt: decoded?.payload?.exp ? new Date(decoded.payload.exp * 1000).toISOString() : null,
                claims: decoded?.payload ? Object.keys(decoded.payload) : [],
                fullPayload: decoded?.payload
            });
            return decoded?.payload;
        } catch (decodeError) {
            await this._log('OIDC_ID_TOKEN_DECODE_ERROR', 'OIDC_ID_TOKEN_DECODE_ERROR', 'accessToken url', {
                error: decodeError.message
            });
            return null;
        }
    }

    _extractProfileFromIdToken(idToken) {
        try {
            const decoded = jwt.decode(idToken, { complete: true });
            const payload = decoded?.payload;
            if (!payload) return null;

            return {
                sub: payload.sub,
                id: payload.sub,
                email: payload.email,
                name: payload.name,
                given_name: payload.given_name,
                family_name: payload.family_name,
                picture: payload.picture,
                email_verified: payload.email_verified,
                preferred_username: payload.preferred_username,
                locale: payload.locale,
                ...payload
            };
        } catch (error) {
            console.error(`Failed to extract profile from ID token: ${error.message}`);
            return null;
        }
    }

    async userProfile(accessToken, done) {
        const logPrefix = this._isOIDC ? 'OIDC' : 'OAUTH2';

        if (this._isOIDC && !this._userinfoURL) {
            if (this._lastIdToken) {
                const profile = this._extractProfileFromIdToken(this._lastIdToken);
                if (profile) {
                    await this._logProfileExtraction(profile);
                    return done(null, profile);
                }
            }
            await this._log('OIDC_NO_ID_TOKEN', 'OIDC_NO_ID_TOKEN', 'id token extraction', {});
            return done(new Error('No ID token available for profile extraction'));
        }

        if (!this._userinfoURL) return done(null, {});

        const startTime = Date.now();

        try {
            const response = await fetch(this._userinfoURL, {
                method: 'GET',
                headers: {
                    'Authorization': `${this._tokenType} ${accessToken}`,
                    'Accept': 'application/json'
                }
            });

            const duration = Date.now() - startTime;

            if (!response.ok) {
                const errorText = await response.text();
                await this._log(`${logPrefix}_USERINFO_HTTP_ERROR`, `${logPrefix}_USERINFO_HTTP_ERROR`, 'userinfo url', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText,
                    duration
                });
                return done(new Error(`UserInfo request failed: ${response.status} ${errorText}`));
            }

            const profile = await response.json();
            const userData = this._isOIDC ? {
                sub: profile?.sub || profile?.id,
                email: profile?.email || profile?.emails?.[0]?.value,
                name: profile?.name || profile?.displayName,
                emailVerified: profile?.email_verified,
                picture: profile?.picture || profile?.photos?.[0]?.value
            } : {
                id: profile?.id,
                login: profile?.login,
                email: profile?.email,
                name: profile?.name
            };

            const logData = {
                duration,
                userData,
                profileKeys: profile ? Object.keys(profile) : []
            };
            if (this._isOIDC) logData.fullProfile = profile;

            await this._log(`${logPrefix}_USERINFO_SUCCESS`, `${logPrefix}_USERINFO_SUCCESS`, 'userinfo url', logData);
            done(null, profile);
        } catch (err) {
            const duration = Date.now() - startTime;
            await this._log(`${logPrefix}_USERINFO_ERROR`, `${logPrefix}_USERINFO_ERROR`, 'userinfo url', {
                error: err.message,
                duration
            });
            done(err);
        }
    }

    async _logProfileExtraction(profile) {
        await this._log('OIDC_PROFILE_FROM_ID_TOKEN', 'OIDC_PROFILE_FROM_ID_TOKEN', 'id token extraction', {
            userData: {
                sub: profile?.sub,
                email: profile?.email,
                name: profile?.name,
                emailVerified: profile?.email_verified,
                picture: profile?.picture
            },
            profileKeys: profile ? Object.keys(profile) : [],
            fullProfile: profile
        });
    }
}

module.exports = UnifiedOAuth2Strategy;
