const passport = require('passport');
const OpenIDConnectStrategy = require('passport-openidconnect');
const { Log } = require('../../components/logs/model');

class CustomOIDCStrategy extends OpenIDConnectStrategy {
    constructor(options, verify) {
        if (!verify || typeof verify !== 'function') {
            throw new TypeError('CustomOIDCStrategy requires a verify callback');
        }

        const oidcOptions = {
            issuer: options.issuer,
            authorizationURL: options.authorizationURL,
            tokenURL: options.tokenURL,
            userInfoURL: options.userInfoURL,
            clientID: options.clientID,
            clientSecret: options.clientSecret,
            callbackURL: options.callbackURL,
            scope: options.scope || 'openid profile email'
        };

        super(oidcOptions, verify);

        this.name = options.name || 'custom-oidc';
        this._strategyName = options.strategyName || this.name;
        this._userinfoURL = options.userInfoURL;
        this._issuer = options.issuer;
        this._originalVerify = verify;

        this._replaceVerifyCallback();
        this._wrapStrategyMethods();
    }

    _replaceVerifyCallback() {
        const originalVerify = this._originalVerify;

        this._verify = (issuer, profile, done) => {
            originalVerify(null, null, profile, done);
        };
    }

    _wrapStrategyMethods() {
        const originalAuthenticate = this.authenticate;

        this.authenticate = function (req, options) {
            const self = this;

            if (req.query?.error) {
                Log.create({
                    type: 'OIDC_AUTH_ERROR',
                    message: 'OIDC_AUTH_ERROR',
                    component: self._strategyName,
                    route: 'callback url',
                    dataNew: {
                        error: req.query.error,
                        errorDescription: req.query.error_description,
                        timestamp: new Date().toISOString()
                    }
                });
            } else if (req.query?.code) {
                Log.create({
                    type: 'OIDC_CALLBACK_RECEIVED',
                    message: 'OIDC_CALLBACK_RECEIVED',
                    component: self._strategyName,
                    route: 'callback url',
                    dataNew: {
                        hasCode: !!req.query.code,
                        codePreview: req.query.code ? req.query.code.substring(0, 10) + '...' : null,
                        hasState: !!req.query.state,
                        timestamp: new Date().toISOString()
                    }
                });
            }

            return originalAuthenticate.call(this, req, options);
        };

        process.nextTick(() => {
            if (this._oauth2?.getOAuthAccessToken) {
                const originalGetOAuthAccessToken = this._oauth2.getOAuthAccessToken.bind(this._oauth2);

                this._oauth2.getOAuthAccessToken = (code, params, callback) => {
                    const startTime = Date.now();
                    const strategy = this;

                    return originalGetOAuthAccessToken(code, params, (err, accessToken, refreshToken, results) => {
                        const duration = Date.now() - startTime;

                        if (err) {
                            Log.create({
                                type: 'OIDC_TOKEN_EXCHANGE_ERROR',
                                message: 'OIDC_TOKEN_EXCHANGE_ERROR',
                                component: strategy._strategyName,
                                route: 'accessToken url',
                                dataNew: {
                                    error: err.message || err.toString(),
                                    statusCode: err.statusCode,
                                    data: err.data,
                                    duration,
                                    timestamp: new Date().toISOString()
                                }
                            });
                        } else {
                            Log.create({
                                type: 'OIDC_TOKEN_EXCHANGE_SUCCESS',
                                message: 'OIDC_TOKEN_EXCHANGE_SUCCESS',
                                component: strategy._strategyName,
                                route: 'accessToken url',
                                dataNew: {
                                    hasAccessToken: !!accessToken,
                                    hasRefreshToken: !!refreshToken,
                                    hasIdToken: !!results?.id_token,
                                    tokenType: results?.token_type,
                                    expiresIn: results?.expires_in,
                                    scope: results?.scope,
                                    duration,
                                    timestamp: new Date().toISOString()
                                }
                            });

                            if (results?.id_token) {
                                try {
                                    const jwt = require('jsonwebtoken');
                                    const decoded = jwt.decode(results.id_token, { complete: true });

                                    Log.create({
                                        type: 'OIDC_ID_TOKEN_RECEIVED',
                                        message: 'OIDC_ID_TOKEN_RECEIVED',
                                        component: strategy._strategyName,
                                        route: 'accessToken url',
                                        dataNew: {
                                            algorithm: decoded?.header?.alg,
                                            issuer: decoded?.payload?.iss,
                                            subject: decoded?.payload?.sub,
                                            audience: decoded?.payload?.aud,
                                            expiresAt: decoded?.payload?.exp ? new Date(decoded.payload.exp * 1000).toISOString() : null,
                                            claims: decoded?.payload ? Object.keys(decoded.payload) : [],
                                            fullPayload: decoded?.payload,
                                            timestamp: new Date().toISOString()
                                        }
                                    });
                                } catch (decodeError) {
                                    Log.create({
                                        type: 'OIDC_ID_TOKEN_DECODE_ERROR',
                                        message: 'OIDC_ID_TOKEN_DECODE_ERROR',
                                        component: strategy._strategyName,
                                        route: 'accessToken url',
                                        dataNew: {
                                            error: decodeError.message,
                                            timestamp: new Date().toISOString()
                                        }
                                    });
                                }
                            } else {
                                Log.create({
                                    type: 'OIDC_NO_ID_TOKEN',
                                    message: 'OIDC_NO_ID_TOKEN',
                                    component: strategy._strategyName,
                                    route: 'accessToken url',
                                    dataNew: {
                                        resultsKeys: results ? Object.keys(results) : [],
                                        results: results,
                                        timestamp: new Date().toISOString()
                                    }
                                });
                            }
                        }

                        callback(err, accessToken, refreshToken, results);
                    });
                };
            }
        });

        if (this._userinfoURL) {
            const originalUserProfile = this.userProfile;

            this.userProfile = function (accessToken, done) {
                const startTime = Date.now();
                const self = this;

                const wrappedDone = (err, profile) => {
                    const duration = Date.now() - startTime;

                    if (err) {
                        Log.create({
                            type: 'OIDC_USERINFO_ERROR',
                            message: 'OIDC_USERINFO_ERROR',
                            component: self._strategyName,
                            route: 'userinfo url',
                            dataNew: {
                                error: err.message,
                                duration,
                                timestamp: new Date().toISOString()
                            }
                        });
                    } else {
                        Log.create({
                            type: 'OIDC_USERINFO_SUCCESS',
                            message: 'OIDC_USERINFO_SUCCESS',
                            component: self._strategyName,
                            route: 'userinfo url',
                            dataNew: {
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
                            }
                        });
                    }

                    done(err, profile);
                };

                return originalUserProfile.call(self, accessToken, wrappedDone);
            };
        }
    }
}

module.exports = CustomOIDCStrategy;