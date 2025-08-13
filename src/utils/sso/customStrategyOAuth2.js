const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const { Log } = require('../../components/logs/model');

class CustomOAuth2Strategy extends OAuth2Strategy {
    constructor(options, verify) {
        if (!verify || typeof verify !== 'function') {
            throw new TypeError('CustomOAuth2Strategy requires a verify callback');
        }

        super(options, verify);

        this.name = options.name || 'custom-oauth2';
        this._userinfoURL = options.userInfoURL;
        this._strategyName = options.strategyName || this.name;
        this._tokenType = options.tokenType || 'Bearer';

        this._logStrategyCreated();
        this._wrapOAuth2Methods();
    }

    _logStrategyCreated() {
        Log.create({
            type: 'OAUTH2_STRATEGY_CREATED',
            message: 'OAUTH2_STRATEGY_CREATED',
            component: this._strategyName,
            route: '/auth/strategy-init',
            dataNew: JSON.stringify({
                strategyName: this._strategyName,
                authorizationURL: this._oauth2?._authorizeUrl,
                tokenURL: this._oauth2?._accessTokenUrl,
                userInfoURL: this._userinfoURL,
                tokenType: this._tokenType,
                timestamp: new Date().toISOString()
            })
        });
    }

    _wrapOAuth2Methods() {
        // Aguardar até que _oauth2 esteja disponível
        process.nextTick(() => {
            if (this._oauth2 && this._oauth2.getAccessToken) {
                const originalGetAccessToken = this._oauth2.getAccessToken.bind(this._oauth2);

                this._oauth2.getAccessToken = (code, params, callback) => {
                    const startTime = Date.now();

                    Log.create({
                        type: 'OAUTH2_TOKEN_EXCHANGE_START',
                        message: 'OAUTH2_TOKEN_EXCHANGE_START',
                        component: this._strategyName,
                        route: '/oauth/token',
                        dataNew: JSON.stringify({
                            hasCode: !!code,
                            codePreview: code ? code.substring(0, 10) + '...' : null,
                            tokenURL: this._oauth2._accessTokenUrl,
                            timestamp: new Date().toISOString()
                        })
                    });

                    return originalGetAccessToken.call(this._oauth2, code, params, (err, accessToken, refreshToken, results) => {
                        const duration = Date.now() - startTime;

                        if (err) {
                            Log.create({
                                type: 'OAUTH2_TOKEN_EXCHANGE_ERROR',
                                message: 'OAUTH2_TOKEN_EXCHANGE_ERROR',
                                component: this._strategyName,
                                route: '/oauth/token',
                                dataNew: JSON.stringify({
                                    error: err.message || err,
                                    statusCode: err.statusCode,
                                    duration,
                                    timestamp: new Date().toISOString()
                                })
                            });
                        } else {
                            Log.create({
                                type: 'OAUTH2_TOKEN_EXCHANGE_SUCCESS',
                                message: 'OAUTH2_TOKEN_EXCHANGE_SUCCESS',
                                component: this._strategyName,
                                route: '/oauth/token',
                                dataNew: JSON.stringify({
                                    hasAccessToken: !!accessToken,
                                    hasRefreshToken: !!refreshToken,
                                    tokenType: results?.token_type,
                                    expiresIn: results?.expires_in,
                                    scope: results?.scope,
                                    duration,
                                    timestamp: new Date().toISOString()
                                })
                            });
                        }

                        callback(err, accessToken, refreshToken, results);
                    });
                };
            } else {
                console.warn('_oauth2 ou getAccessToken não disponível para wrapping (OAuth2)');
            }
        });
    }

    userProfile(accessToken, done) {
        if (!this._userinfoURL) {
            return done(null, {}); // OAuth2 pode não ter userInfo endpoint
        }

        const startTime = Date.now();

        Log.create({
            type: 'OAUTH2_USERINFO_REQUEST_START',
            message: 'OAUTH2_USERINFO_REQUEST_START',
            component: this._strategyName,
            route: '/userinfo',
            dataNew: JSON.stringify({
                url: this._userinfoURL,
                hasAccessToken: !!accessToken,
                tokenType: this._tokenType,
                timestamp: new Date().toISOString()
            })
        });

        fetch(this._userinfoURL, {
            method: 'GET',
            headers: {
                'Authorization': `${this._tokenType} ${accessToken}`,
                'Accept': 'application/json'
            }
        })
            .then(async response => {
                const duration = Date.now() - startTime;

                if (!response.ok) {
                    const errorText = await response.text();

                    Log.create({
                        type: 'OAUTH2_USERINFO_HTTP_ERROR',
                        message: 'OAUTH2_USERINFO_HTTP_ERROR',
                        component: this._strategyName,
                        route: '/userinfo',
                        dataNew: JSON.stringify({
                            status: response.status,
                            statusText: response.statusText,
                            error: errorText,
                            duration,
                            timestamp: new Date().toISOString()
                        })
                    });

                    throw new Error(`UserInfo request failed: ${response.status} ${errorText}`);
                }

                return response.json();
            })
            .then(profile => {
                const duration = Date.now() - startTime;

                Log.create({
                    type: 'OAUTH2_USERINFO_SUCCESS',
                    message: 'OAUTH2_USERINFO_SUCCESS',
                    component: this._strategyName,
                    route: '/userinfo',
                    dataNew: JSON.stringify({
                        duration,
                        userData: {
                            id: profile?.id,
                            login: profile?.login,
                            email: profile?.email,
                            name: profile?.name
                        },
                        profileKeys: profile ? Object.keys(profile) : [],
                        timestamp: new Date().toISOString()
                    })
                });

                done(null, profile);
            })
            .catch(err => {
                const duration = Date.now() - startTime;

                Log.create({
                    type: 'OAUTH2_USERINFO_ERROR',
                    message: 'OAUTH2_USERINFO_ERROR',
                    component: this._strategyName,
                    route: '/userinfo',
                    dataNew: JSON.stringify({
                        error: err.message,
                        duration,
                        timestamp: new Date().toISOString()
                    })
                });

                done(err);
            });
    }
}

module.exports = CustomOAuth2Strategy;