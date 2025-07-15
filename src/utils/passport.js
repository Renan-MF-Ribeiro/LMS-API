const passport = require('passport');
const passportSaml = require('passport-saml');
const OpenIDConnectStrategy = require('passport-openidconnect');
const OAuth2Strategy = require('passport-oauth2');
const LocalStrategy = require('passport-local');

const bcrypt = require('bcryptjs');
const cryptoJS = require('crypto-js');
const axios = require('axios');

const { log } = require('./logger');
const { getRequestStrategyName } = require('./auth');
const { session } = require('./session');

const ApiError = require('../errors/ApiError');

const { getLoginConfig } = require('../components/users/business');
const { Log } = require('../components/logs/model');
const { User } = require('../components/users/model');

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
        (profile, done) => {
            profile.strategyName = strategyName;
            return done(null, profile);
        },
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

async function createOauth2Strategy(config) {
    if (config.clientSecret?.length) return createOpenIdConnectStrategy(config);

    log('createOauth2Strategy config', config);
    const strategyName = config.strategyName;

    const strategy = new OAuth2Strategy(
        {
            authorizationURL: config.authorizationUrl,
            tokenURL: config.tokenUrl,
            clientID: config.clientId,
            callbackURL: config.callbackUrl,
            scope: config.scope?.length ? config.scope : [],
            state: true,
            proxy: true,
            pkce: true,

        },
        async (accessToken, _refreshToken, profile, done) => {
            profile.strategyName = strategyName;

            if (accessToken) {
                const tokenType = config.tokenType || 'Bearer';

                const { data } = await axios.get(config.userInfoUrl, {
                    headers: {
                        Authorization: `${tokenType} ${accessToken}`,
                    },
                });

                profile = {
                    ...profile,
                    ...data,
                }
            }

            return done(null, profile);
        }
    );

    strategy.authorizationParams = () => {
        const params = {};

        if (config.forceAuth) {
            params.prompt = 'login';
        }

        return params;
    }

    passport.use(strategyName, strategy);
}

async function createLocalStrategy() {
    passport.use(new LocalStrategy(
        { usernameField: 'login', passwordField: 'password' },
        async function verifyUser(login, password, cb) {
            const decrypted = cryptoJS.AES.decrypt(password, 'pass');
            const passwordDecrypted = decrypted.toString(cryptoJS.enc.Utf8);

            const user = await User.findOne({ networkLogin: { $eq: login }, status: 'ATIVO' }).lean();

            const pass = user?.password?.filter(function (obj) {
                return obj.valid && bcrypt.compareSync(passwordDecrypted, obj.hash);
            });

            if (!user || pass?.length === 0) {
                return cb(new ApiError('Usuário ou senha inválidos', 401), null);
            }

            return cb(null, {
                _id: String(user._id),
                networkLogin: user.networkLogin,
                name: user.name,
                email: user.email,
                registration: user.registration,
                groupsAD: user.groupsAD,
                strategyName: 'local',
            });
        }
    ));
}

function initializePassport(app) {
    app.use(session);
    app.use(passport.initialize());
    app.use(passport.session());
}

async function authenticatePassport(req, res, next) {
    const strategyName = getRequestStrategyName(req);

    log('authenticatePassport strategyName', strategyName);

    passport.authenticate(
        strategyName,
        { session: true },
        async (err, user, info, status) => {
            if (err) {
                await Log.create({
                    type: 'PASSPORT_CALLBACK_ERROR',
                    message: 'PASSPORT_CALLBACK_ERROR',
                    component: 'authenticatePassport',
                    route: req.originalUrl,
                    dataNew: JSON.stringify({ err, user, info, status }),
                });

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
        }
    )(req, res, next);
}

async function strategyHandler(config) {
    const strategyCreators = {
        saml: createSamlPassportStrategy,
        oauth2: createOauth2Strategy,
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

    await createLocalStrategy();

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
    createStrategiesFromLoginConfigs,
    removeStrategies,
    parseSamlResponse,
};
