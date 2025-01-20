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

async function createSamlPassportStrategy(config) {
    log('createSamlPassportStrategy config', {
        ...config,
        certifier: config.certifier?.slice(-5) ?? null,
    });
    const strategyName = config.strategyName || 'saml';

    const strategy = new passportSaml.Strategy(
        {
            name: strategyName,
            forceAuthn: config.forceAuth || false,
            entryPoint: config.entrypoint,
            issuer: config.issuer,
            callbackUrl: `${config.callback_url}?strategy=${strategyName}`,
            cert: config.certifier,
        },
        (profile, done) => done(null, profile),
    );

    passport.use(strategy);
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

async function createStrategiesFromLoginConfigs() {
    const loginConfig = await getLoginConfig();

    const configs = loginConfig.ssoForm ?? [];

    for await (const config of configs) {
        if (config?.enabled) {
            await createSamlPassportStrategy(config);
        }
    }
}

createStrategiesFromLoginConfigs();

module.exports = { initializePassport, authenticatePassportSaml, getRequestStrategyName };
