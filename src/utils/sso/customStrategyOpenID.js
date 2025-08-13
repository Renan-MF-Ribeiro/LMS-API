const passport = require('passport');
const OpenIDConnectStrategy = require('passport-openidconnect');
const { Log } = require('../../components/logs/model');

class CustomOIDCStrategy extends OpenIDConnectStrategy {
    constructor(options, verify) {
        if (!verify || typeof verify !== 'function') {
            throw new TypeError('CustomOIDCStrategy requires a verify callback');
        }

        // Adaptar opções para passport-openidconnect
        const oidcOptions = {
            issuer: options.issuer,
            authorizationURL: options.authorizationURL,
            tokenURL: options.tokenURL,
            userInfoURL: options.userInfoURL, // Opcional - se não fornecido, usa ID Token
            clientID: options.clientID,
            clientSecret: options.clientSecret,
            callbackURL: options.callbackURL,
            scope: options.scope || 'openid profile email'
        };

        // ✅ Primeiro chamar super, depois configurar wrappers
        super(oidcOptions, verify);

        this.name = options.name || 'custom-oidc';
        this._strategyName = options.strategyName || this.name;
        this._userinfoURL = options.userInfoURL;
        this._issuer = options.issuer;
        this._originalVerify = verify;

        // ✅ Agora que super foi chamado, podemos usar this
        this._replaceVerifyCallback();
        this._logStrategyCreated();
        this._wrapStrategyMethods();
    }

    _replaceVerifyCallback() {
        // ✅ Substituir o verify callback após a construção
        const originalVerify = this._originalVerify;

        this._verify = (issuer, profile, done) => {
            Log.create({
                type: 'OIDC_VERIFY_CALLBACK_CALLED',
                message: 'OIDC_VERIFY_CALLBACK_CALLED',
                component: this._strategyName,
                route: '/auth/verify',
                dataNew: JSON.stringify({
                    issuer: issuer,
                    profileKeys: profile ? Object.keys(profile) : [],
                    hasProfile: !!profile,
                    profileData: profile,
                    rawProfile: JSON.stringify(profile),
                    timestamp: new Date().toISOString()
                })
            });

            console.log('🔍 DEBUG - Verify callback received:');
            console.log('- Issuer:', issuer);
            console.log('- Profile:', profile);
            console.log('- Profile keys:', profile ? Object.keys(profile) : 'null');

            // ✅ Chamar verify original com assinatura correta
            originalVerify(null, null, profile, done);
        };
    }

    _logStrategyCreated() {
        Log.create({
            type: 'OIDC_STRATEGY_CREATED',
            message: 'OIDC_STRATEGY_CREATED',
            component: this._strategyName,
            route: '/auth/strategy-init',
            dataNew: JSON.stringify({
                strategyName: this._strategyName,
                issuer: this._issuer,
                authorizationURL: this._oauth2?._authorizeUrl,
                tokenURL: this._oauth2?._accessTokenUrl,
                userInfoURL: this._userinfoURL,
                hasUserInfoURL: !!this._userinfoURL,
                timestamp: new Date().toISOString()
            })
        });
    }

    _wrapStrategyMethods() {
        // ✅ Interceptar o método authenticate para logging
        const originalAuthenticate = this.authenticate;

        this.authenticate = function (req, options) {
            const self = this;

            if (req.query && req.query.error) {
                Log.create({
                    type: 'OIDC_AUTH_ERROR',
                    message: 'OIDC_AUTH_ERROR',
                    component: self._strategyName,
                    route: '/oauth/callback',
                    dataNew: JSON.stringify({
                        error: req.query.error,
                        errorDescription: req.query.error_description,
                        timestamp: new Date().toISOString()
                    })
                });
            } else if (req.query && req.query.code) {
                Log.create({
                    type: 'OIDC_CALLBACK_RECEIVED',
                    message: 'OIDC_CALLBACK_RECEIVED',
                    component: self._strategyName,
                    route: '/oauth/callback',
                    dataNew: JSON.stringify({
                        hasCode: !!req.query.code,
                        codePreview: req.query.code ? req.query.code.substring(0, 10) + '...' : null,
                        hasState: !!req.query.state,
                        timestamp: new Date().toISOString()
                    })
                });
            }

            return originalAuthenticate.call(this, req, options);
        };

        // ✅ Interceptar token exchange para logging
        process.nextTick(() => {
            if (this._oauth2 && this._oauth2.getOAuthAccessToken) {
                const originalGetOAuthAccessToken = this._oauth2.getOAuthAccessToken.bind(this._oauth2);

                this._oauth2.getOAuthAccessToken = (code, params, callback) => {
                    const startTime = Date.now();

                    Log.create({
                        type: 'OIDC_TOKEN_EXCHANGE_START',
                        message: 'OIDC_TOKEN_EXCHANGE_START',
                        component: this._strategyName,
                        route: '/oauth/token',
                        dataNew: JSON.stringify({
                            hasCode: !!code,
                            codePreview: code ? code.substring(0, 10) + '...' : null,
                            grantType: params.grant_type,
                            tokenURL: this._accessTokenUrl,
                            timestamp: new Date().toISOString()
                        })
                    });

                    const strategy = this;

                    return originalGetOAuthAccessToken(code, params, (err, accessToken, refreshToken, results) => {
                        const duration = Date.now() - startTime;

                        if (err) {
                            Log.create({
                                type: 'OIDC_TOKEN_EXCHANGE_ERROR',
                                message: 'OIDC_TOKEN_EXCHANGE_ERROR',
                                component: strategy._strategyName,
                                route: '/oauth/token',
                                dataNew: JSON.stringify({
                                    error: err.message || err.toString(),
                                    statusCode: err.statusCode,
                                    data: err.data,
                                    duration,
                                    timestamp: new Date().toISOString()
                                })
                            });
                        } else {
                            Log.create({
                                type: 'OIDC_TOKEN_EXCHANGE_SUCCESS',
                                message: 'OIDC_TOKEN_EXCHANGE_SUCCESS',
                                component: strategy._strategyName,
                                route: '/oauth/token',
                                dataNew: JSON.stringify({
                                    hasAccessToken: !!accessToken,
                                    hasRefreshToken: !!refreshToken,
                                    hasIdToken: !!(results && results.id_token),
                                    tokenType: results?.token_type,
                                    expiresIn: results?.expires_in,
                                    scope: results?.scope,
                                    duration,
                                    timestamp: new Date().toISOString()
                                })
                            });

                            // ✅ Log do ID Token se presente
                            if (results && results.id_token) {
                                try {
                                    const jwt = require('jsonwebtoken');
                                    const decoded = jwt.decode(results.id_token, { complete: true });

                                    Log.create({
                                        type: 'OIDC_ID_TOKEN_RECEIVED',
                                        message: 'OIDC_ID_TOKEN_RECEIVED',
                                        component: strategy._strategyName,
                                        route: '/oauth/token',
                                        dataNew: JSON.stringify({
                                            algorithm: decoded?.header?.alg,
                                            issuer: decoded?.payload?.iss,
                                            subject: decoded?.payload?.sub,
                                            audience: decoded?.payload?.aud,
                                            expiresAt: decoded?.payload?.exp ? new Date(decoded.payload.exp * 1000).toISOString() : null,
                                            claims: decoded?.payload ? Object.keys(decoded.payload) : [],
                                            fullPayload: decoded?.payload,
                                            timestamp: new Date().toISOString()
                                        })
                                    });

                                    console.log('🔍 DEBUG - ID Token payload:', decoded?.payload);
                                } catch (decodeError) {
                                    Log.create({
                                        type: 'OIDC_ID_TOKEN_DECODE_ERROR',
                                        message: 'OIDC_ID_TOKEN_DECODE_ERROR',
                                        component: strategy._strategyName,
                                        route: '/oauth/token',
                                        dataNew: JSON.stringify({
                                            error: decodeError.message,
                                            timestamp: new Date().toISOString()
                                        })
                                    });
                                    console.error('❌ Erro ao decodificar ID Token:', decodeError);
                                }
                            } else {
                                console.log('⚠️ Nenhum ID Token encontrado nos results');
                                Log.create({
                                    type: 'OIDC_NO_ID_TOKEN',
                                    message: 'OIDC_NO_ID_TOKEN',
                                    component: strategy._strategyName,
                                    route: '/oauth/token',
                                    dataNew: JSON.stringify({
                                        resultsKeys: results ? Object.keys(results) : [],
                                        results: results,
                                        timestamp: new Date().toISOString()
                                    })
                                });
                            }
                        }

                        callback(err, accessToken, refreshToken, results);
                    });
                };
            }
        });

        // ✅ Interceptar userProfile para logging (passport-openidconnect chama isso automaticamente)
        const originalUserProfile = this.userProfile;

        this.userProfile = function (accessToken, done) {
            const startTime = Date.now();
            const self = this;

            console.log('🔍 DEBUG - userProfile called:');
            console.log('- Has userInfoURL:', !!self._userinfoURL);
            console.log('- AccessToken:', accessToken ? accessToken.substring(0, 20) + '...' : 'null');

            if (!self._userinfoURL) {
                Log.create({
                    type: 'OIDC_USERINFO_SKIPPED',
                    message: 'OIDC_USERINFO_SKIPPED',
                    component: self._strategyName,
                    route: '/userinfo',
                    dataNew: JSON.stringify({
                        reason: 'No userInfoURL configured - passport-openidconnect should use ID Token automatically',
                        hasAccessToken: !!accessToken,
                        timestamp: new Date().toISOString()
                    })
                });

                console.log('✅ Calling original userProfile (should use ID Token)...');
            } else {
                Log.create({
                    type: 'OIDC_USERINFO_REQUEST_START',
                    message: 'OIDC_USERINFO_REQUEST_START',
                    component: self._strategyName,
                    route: '/userinfo',
                    dataNew: JSON.stringify({
                        url: self._userinfoURL,
                        hasAccessToken: !!accessToken,
                        timestamp: new Date().toISOString()
                    })
                });
            }

            // Wrapper do callback para logging detalhado
            const wrappedDone = (err, profile) => {
                const duration = Date.now() - startTime;

                console.log('🔍 DEBUG - userProfile callback result:');
                console.log('- Error:', err);
                console.log('- Profile:', profile);
                console.log('- Profile keys:', profile ? Object.keys(profile) : 'none');

                if (err) {
                    Log.create({
                        type: 'OIDC_USERINFO_ERROR',
                        message: 'OIDC_USERINFO_ERROR',
                        component: self._strategyName,
                        route: '/userinfo',
                        dataNew: JSON.stringify({
                            error: err.message,
                            duration,
                            timestamp: new Date().toISOString()
                        })
                    });
                } else {
                    Log.create({
                        type: 'OIDC_USERINFO_SUCCESS',
                        message: 'OIDC_USERINFO_SUCCESS',
                        component: self._strategyName,
                        route: '/userinfo',
                        dataNew: JSON.stringify({
                            duration,
                            userData: {
                                sub: profile?.sub || profile?.id,
                                email: profile?.email || profile?.emails?.[0]?.value,
                                name: profile?.name || profile?.displayName,
                                emailVerified: profile?.email_verified,
                                picture: profile?.picture || profile?.photos?.[0]?.value
                            },
                            profileKeys: profile ? Object.keys(profile) : [],
                            fullProfile: profile,
                            timestamp: new Date().toISOString()
                        })
                    });
                }

                done(err, profile);
            };

            return originalUserProfile.call(self, accessToken, wrappedDone);
        };
    }
}

module.exports = CustomOIDCStrategy;