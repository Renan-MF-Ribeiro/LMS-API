const passport = require('passport');
const passportSaml = require('passport-saml');
const OpenIDConnectStrategy = require('passport-openidconnect');
const axios = require('axios');

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
            scope: ['openid', 'profile', config.claim],

        },
        async (issuer, profile, accessToken, refreshToken, done) => {

            profile.groups = refreshToken ? decodeJWT(refreshToken).groups || [] : [];
            profile.strategyName = strategyName;
            profile.issuer = issuer;

            return done(null, profile);
        }
    );

    passport.use(strategyName, strategy);
}

function getRequestStrategyName(req) {
    return req.query?.strategy ?? req.session.strategy;
}

function initializePassport(app) {
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

    const createStrategy = strategyCreators[config.strategyType];
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

    console.log('estratégias', Object.keys(passport._strategies))
}

function removeStrategies(strategies = []) {
    log('removeStrategies strategies', strategies);
    strategies.forEach(strategy => passport.unuse(strategy));
}

function decodeJWT(token) {
    try {
        const [header, payload, signature] = token.split('.');

        const decodedPayload = Buffer.from(payload, 'base64').toString('utf-8');

        return JSON.parse(decodedPayload);
    } catch (error) {
        console.error('Erro ao decodificar o token JWT:', error);
        throw new Error('Token JWT inválido.');
    }
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
