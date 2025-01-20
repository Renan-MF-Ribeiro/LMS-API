const passport = require('passport');
const passportSaml = require('passport-saml');

const { log } = require('./logger');

const { getLoginConfig } = require('../components/users/business');

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

async function createSamlPassportStrategy(strategyName = 'saml') {
    const loginConfig = await getLoginConfig();

    log('createSamlPassportStrategy strategyName', strategyName);

    if (loginConfig?.ssoForm?.enabled) {
        const strategy = new passportSaml.Strategy(
            {
                name: strategyName,
                forceAuthn: loginConfig.ssoForm.forceAuth ?? false,
                entryPoint: loginConfig.ssoForm.entrypoint,
                issuer: loginConfig.ssoForm.issuer,
                callbackUrl: `${loginConfig.ssoForm.callback_url}?strategy=${strategyName}`,
                cert: loginConfig.ssoForm.certifier,
            },
            (profile, done) => done(null, profile),
        );

        passport.use(strategy);
    }
}

function getRequestStrategyName(req) {
    return req.query?.strategy ?? 'saml';
}

function initializePassport(app) {
    app.use(passport.initialize());
    app.use(passport.session());
}

async function authenticatePassportSaml(req, res, next) {
    const strategyName = getRequestStrategyName(req);

    log('authenticatePassportSaml strategyName', strategyName);

    passport.authenticate(strategyName, {
        failureRedirect: '/',
        failureFlash: true,
    })(req, res, next);
}

createSamlPassportStrategy()

module.exports = { initializePassport, authenticatePassportSaml, getRequestStrategyName };
