const passport = require('passport');
const session = require('express-session');
const passportSaml = require('passport-saml');
const OpenIDConnectStrategy = require('passport-openidconnect');

const { log } = require('./logger');
const { getLoginConfig } = require('../components/users/business');
const { getCookieProps } = require('./cookies');
const environment = require('../environment');
const { Log } = require('../components/logs/model');

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
            scope: config.scope?.length ? config.scope : ['openid', 'profile'],

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
    return req.query?.strategy ?? req.cookies.strategyName ?? 'saml';
}

function initializePassport(app) {
    app.use(session({
        secret: environment.PROJECT_SECRET_KEY,
        resave: false,
        saveUninitialized: true,
        cookie: getCookieProps(),
    }));

    app.use(passport.initialize());
    app.use(passport.session());
}

async function authenticatePassport(req, res, next) {
    const strategyName = getRequestStrategyName(req);

    log('authenticatePassport strategyName', strategyName);

    passport.authenticate(strategyName, {
        failureRedirect: '/',
        failureFlash: true,
    }, async (err, user, info, status) => {
        // save logs and continue with passport authentication
        await Log.create({
            type: 'PASSPORT_CALLBACK',
            message: 'PASSPORT_CALLBACK',
            component: 'authenticatePassport',
            route: req.originalUrl,
            dataNew: JSON.stringify({ err, user, info, status }),
        });


        if (err) {
            return next(err);
        }

        if (!user) {
            return res.redirect('/');
        }

        req.logIn(user, (loginErr) => {
            if (loginErr) {
                return next(loginErr);
            }

            return next();
        });
    })(req, res, next);

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

function parseSamlUserToJson(user) {
    const samlUserObject = {};
    const attributes = user.attributes || {};

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    for (const [key, value] of Object.entries(attributes)) {
        const normalizedKey = key
            .replace(/[^\w]/g, ' ') // Remove non-word characters
            .split(' ') // Split by spaces
            .map((word, i) => i === 0 ? word.toLowerCase() : capitalize(word)) // Lowercase first word, capitalize others
            .join('');

        samlUserObject[normalizedKey] = Array.isArray(value) ? value[0] : value;
    }

    return samlUserObject;
}

async function parseSamlResponse(req, res, next) {
    req.samlUserObject = req.user ? parseSamlUserToJson(req.user) : null;

    next();
}

createStrategiesFromLoginConfigs();

module.exports = {
    initializePassport,
    authenticatePassport,
    getRequestStrategyName,
    createStrategiesFromLoginConfigs,
    removeStrategies,
    parseSamlResponse,
};
