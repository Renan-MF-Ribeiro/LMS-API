const passport = require('passport');
const session = require('express-session');
const passportSaml = require('passport-saml');
const OpenIDConnectStrategy = require('passport-openidconnect');

const { log } = require('./logger');
const { getLoginConfig } = require('../components/users/business');
const { getCookieProps } = require('./cookies');

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
    const strategyName = config.strategyName;

    const strategy = new passportSaml.Strategy(
        {
            name: strategyName,
            forceAuthn: config.forceAuth || false,
            entryPoint: config.entrypoint,
            issuer: config.issuer,
            callbackUrl: `${config.callbackUrl}?strategy=${strategyName}`,
            cert: config.certifier,
        },
        (profile, done) => done(null, profile),
    );

    passport.use(strategy);
}

async function createOpenIdConnectStrategy(config) {
    log('createOpenIdConnectStrategy config', config);
    const strategyName = config.strategyName;

    const strategy = new OpenIDConnectStrategy(
        {
            issuer: config.issuer,
            authorizationURL: config.authorizationUrl,
            tokenURL: config.tokenUrl,
            userInfoURL: config.userInfoUrl,
            clientID: config.clientId,
            clientSecret: config.clientSecret,
            callbackURL: config.callbackUrl,
            authorizationParams: {
                prompt: config.forceAuth ? 'login' : 'none',
            },
            scope: ['openid', 'profile', config.claim],

        },
        async (issuer, profile, done) => {

            profile.strategyName = strategyName;
            profile.issuer = issuer;

            return done(null, profile);
        }
    );

    passport.use(strategyName, strategy);
}

function getRequestStrategyName(req) {
    console.log(req.query, req.cookies)
    return req.query?.strategy ?? req.cookies.strategyName ?? 'saml';
}

function initializePassport(app) {
    app.use(session({
        secret: 'seuSegredoSeguro',
        resave: false,
        saveUninitialized: true,
        cookie: getCookieProps()
    }))
    app.use(passport.initialize());
    app.use(passport.session());
}

async function authenticatePassport(req, res, next) {
    const strategyName = getRequestStrategyName(req);

    log('authenticatePassport strategyName', strategyName);

    passport.authenticate(strategyName, {
        failureRedirect: '/',
        failureFlash: true,
    })(req, res, next);

}

function saveStrategyOnSession(req, res, next) {
    const strategyName = getRequestStrategyName(req)
    req.session.strategy = strategyName;
    next();
}

async function strategyHandler(config) {
    const strategyCreators = {
        saml: createSamlPassportStrategy,
        openid: createOpenIdConnectStrategy
    };

    const createStrategy = strategyCreators[config.strategyType ?? 'saml'];
    if (!createStrategy) {
        throw new Error(`Estratégia desconhecida: ${config.strategyType}`);
    }
    return await createStrategy(config);
}

async function createStrategiesFromLoginConfigs() {
    const loginConfig = await getLoginConfig();

    const ssoConfigs = loginConfig.ssoForm ?? [];
    for await (const config of ssoConfigs) {
        if (config?.enabled) {
            await strategyHandler(config);
        }
    }

    log('createStrategiesFromLoginConfigs strategies', Object.keys(passport._strategies));
}

function removeStrategies(strategies = []) {
    log('removeStrategies strategies', strategies);
    strategies.forEach(strategy => passport.unuse(strategy));
}

createStrategiesFromLoginConfigs();

module.exports = {
    initializePassport,
    authenticatePassport,
    saveStrategyOnSession,
    getRequestStrategyName,
    createStrategiesFromLoginConfigs,
    removeStrategies
};
