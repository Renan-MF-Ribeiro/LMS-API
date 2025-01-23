const passport = require('passport');
const passportSaml = require('passport-saml');
const { ConfigLogin } = require('../components/theme/login-config/model');
const fs = require('fs')

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

const configurePassport = async () => {
    try {
        let strategy
        const config = await ConfigLogin.findOne({})
            .sort({ createdAt: -1 })
        if (config) {


            strategy = new passportSaml.Strategy(
                {
                    entryPoint: config.ssoForm.entrypoint,
                    issuer: config.ssoForm.issuer,
                    callbackUrl: config.ssoForm.callback_url,
                    cert: config.ssoForm.certifier,
                },
                (profile, done) => done(null, profile),
            );
        } else {
            strategy = new passportSaml.Strategy(
                {
                    forceAuthn: true,
                    entryPoint: process.env.SSO_ENTRYPOINT,
                    issuer: process.env.SSO_ISSUER,
                    callbackUrl: process.env.SSO_CALLBACK_URL,
                    cert: fs.readFileSync('cert/' + process.env.SSO_CERTIFIER + '.cer', 'utf-8'),
                },
                (profile, done) => done(null, profile),
            )
        }

        passport.use(strategy);
    } catch (error) {
        console.error('Error configuring passport:', error);
    }
};

configurePassport();

module.exports = passport;
