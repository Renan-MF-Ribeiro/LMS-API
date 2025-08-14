const OAuth2Strategy = require('passport-oauth2');
const axios = require('axios');

class CustomOAuth2Strategy extends OAuth2Strategy {
    _isOIDC = false;
    _userInfoUrl = null;
    _tokenType = 'Bearer';
    _forceAuth = false;
    _logFunction = null;

    constructor({ userInfoUrl, tokenType, isOIDC, forceAuth, logFunction, ...options }, verify) {
        super(options, verify);

        this._isOIDC = isOIDC || false;
        this._userInfoUrl = userInfoUrl || null;
        this._tokenType = tokenType || 'Bearer';
        this._forceAuth = forceAuth || false;
        this._logFunction = logFunction || null;

        this._wrapGetOAuthAccessToken();
    }

    authenticate(req, options) {
        if (this._logFunction) this._logFunction({ step: 'authenticate', req, options }).catch(() => {});
        
        return super.authenticate(req, options);
    }

    async userProfile(accessToken, done) {
        let profile = {};

        if (accessToken && this._userInfoUrl) {
            const tokenType = this._tokenType;

            const { data } = await axios.get(this._userInfoUrl, {
                headers: {
                    Authorization: `${tokenType} ${accessToken}`,
                },
            });

            profile = data;
        }

        if (this._logFunction) this._logFunction({ step: 'userProfile', accessToken }).catch(() => {});

        return done(null, profile);
    }

    authorizationParams(_options) {
        if (this._forceAuth) {
            return {
                prompt: 'login'
            };
        }

        return {};
    }

    _wrapGetOAuthAccessToken() {
        const original = this._oauth2.getOAuthAccessToken.bind(this._oauth2);

        this._oauth2.getOAuthAccessToken = (code, params, callback) => {
            if (this._logFunction) this._logFunction({ step: 'getOAuthCode', code, params }).catch(() => {});
            
            return original(code, params, (err, accessToken, refreshToken, results) => {
                if (this._isOIDC && results?.id_token) {
                    if (this._logFunction) this._logFunction({ step: 'getOAuthAccessToken_idToken', err, accessToken, refreshToken, results }).catch(() => {});

                    return callback(null, accessToken, results.id_token, results);
                }

                if (this._logFunction) this._logFunction({ step: 'getOAuthAccessToken_accessToken', err, accessToken, refreshToken, results }).catch(() => { });

                callback(err, accessToken, refreshToken, results);
            });
        };
    }
}

module.exports = CustomOAuth2Strategy;
