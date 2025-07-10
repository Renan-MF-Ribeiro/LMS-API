const expressSession = require('express-session');
const MongoStore = require('connect-mongo');

const { log } = require('./logger');
const { getConnectionString, getDbOptions } = require('./db');
const { getCookieProps } = require('./cookies');
const environment = require('../environment');

const dbOptions = getDbOptions();

const sessionMaxAge = environment.SESSION_MAX_AGE;

const sessionStore = MongoStore.create({
    mongoUrl: getConnectionString(),
    mongoOptions: {
        useNewUrlParser: dbOptions.useNewUrlParser,
        useUnifiedTopology: dbOptions.useUnifiedTopology
    },
    collectionName: 'sessions',
    autoRemove: 'disabled',
    touchAfter: sessionMaxAge,
    stringify: false,
});

sessionStore.on('create', (sessionId) => {
    log(`Session created: ${sessionId}`);
});

sessionStore.on('touch', (sessionId) => {
    log(`Session touched: ${sessionId}`);
});

sessionStore.on('update', (sessionId) => {
    log(`Session updated: ${sessionId}`);
});

sessionStore.on('set', (sessionId) => {
    log(`Session set: ${sessionId}`);
});

sessionStore.on('destroy', (sessionId) => {
    log(`Session destroyed: ${sessionId}`);
});

const session = expressSession({
    secret: environment.PROJECT_SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: getCookieProps(),
    store: sessionStore,
})

module.exports = { sessionStore, session };
