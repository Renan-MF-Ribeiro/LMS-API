const passport = require('passport');
const passportSaml = require('passport-saml');

const { getLoginConfig } = require('../components/users/business');

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

async function configurePassport(name = 'saml') {
    const loginConfig = await getLoginConfig();

    if (loginConfig?.ssoForm) {
        const strategy = new passportSaml.Strategy(
            {
                name,
                forceAuthn: loginConfig.ssoForm.forceAuth ?? false,
                entryPoint: loginConfig.ssoForm.entrypoint,
                issuer: loginConfig.ssoForm.issuer,
                callbackUrl: `${loginConfig.ssoForm.callback_url}?name=${name}`,
                cert: loginConfig.ssoForm.certifier,
            },
            (profile, done) => done(null, profile),
        );

        passport.use(strategy);
    }
}

function getRequestStrategyName(req) {
    return req.query?.name ?? 'saml';
}

function initializePassport(app) {
    app.use(passport.initialize());
    app.use(passport.session());
}

async function configurePassportSaml(req, res, next) {
    const authName = getRequestStrategyName(req);

    await configurePassport(authName);

    next();
}

async function authenticatePassportSaml(req, res, next) {
    const authName = getRequestStrategyName(req);

    passport.authenticate(authName, {
        failureRedirect: '/',
        failureFlash: true,
    })(req, res, next);
}

module.exports = { initializePassport, configurePassportSaml, authenticatePassportSaml };
