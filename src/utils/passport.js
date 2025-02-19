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

async function createOpenIdConnectStrategy(config) {
    log('createOpenIdConnectStrategy config', config);
    const strategyName = config.strategyName || 'openidconnect';

    const strategy = new OpenIDConnectStrategy(
        {
            issuer: config.issuer,
            authorizationURL: config.authorization_url,
            tokenURL: config.token_url,
            userInfoURL: config.user_info_url,
            clientID: config.client_id,
            clientSecret: config.client_secret,
            callbackURL: config.callback_url,
            //alterar scope para ser dinamico com oq o cliente escolher, depois scopos pode precisar de aprovação do google.
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
    return req.query?.strategy;
}

function initializePassport(app) {
    app.use(passport.initialize());
    app.use(passport.session());
}

async function authenticatePassportSAML(req, res, next) {
    const strategyName = getRequestStrategyName(req) ?? 'saml';
    log('authenticatePassportSAML strategyName', strategyName);

    passport.authenticate(strategyName, {
        failureRedirect: '/',
        failureFlash: true,
    })(req, res, next);
}

function authenticatePassportOPENID(req, res, next) {
    const strategyName = getRequestStrategyName(req) ?? req.session.strategy
    log('authenticatePassportOPENID strategyName', strategyName);

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

async function createStrategiesFromLoginConfigs() {
    const loginConfig = await getLoginConfig();

    const ssoConfigs = loginConfig.ssoForm ?? [];
    for await (const config of ssoConfigs) {
        if (config?.enabled) {
            await createSamlPassportStrategy(config);
        }
    }

    const openidConfigs = loginConfig.openidForm ?? [];
    for await (const config of openidConfigs) {
        if (config?.enabled) {
            await createOpenIdConnectStrategy(config);
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
    authenticatePassportSAML,
    authenticatePassportOPENID,
    saveStrategyOnSession,
    getRequestStrategyName,
    createStrategiesFromLoginConfigs,
    removeStrategies
};
