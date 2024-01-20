const passport = require('passport');
const passportSaml = require('passport-saml');
const { ConfigLogin } = require('../components/theme/login-config/model');

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

const configurePassport = async () => {
    try {
        const config = await ConfigLogin.findOne({})
            .sort({ createdAt: -1 })

        const strategy = new passportSaml.Strategy(
            {
                entryPoint: config.ssoForm.entrypoint,
                issuer: config.ssoForm.issuer,
                callbackUrl: config.ssoForm.callback_url,
                cert: config.ssoForm.certifier,
            },
            (profile, done) => done(null, profile),
        );

        passport.use(strategy);
    } catch (error) {
        console.error('Error configuring passport:', error);
    }
};

configurePassport();

module.exports = passport;
