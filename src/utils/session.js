const expressSession = require('express-session');
const MongoStore = require('connect-mongo');

const { log } = require('./logger');
const { getConnectionString, getDbOptions } = require('./db');
const { getCookieProps } = require('./cookies');
const environment = require('../environment');

const sessionMaxAge = environment.SESSION_MAX_AGE;

let sessionStore;

function createSessionStore() {
    if (!sessionStore) {
        sessionStore = MongoStore.create({
            mongoUrl: getConnectionString(),
            collectionName: 'sessions',
            autoRemove: 'native',
            touchAfter: sessionMaxAge / 1000, // Convert milliseconds to seconds
            stringify: false,
            ttl: sessionMaxAge / 1000, // Convert milliseconds to seconds
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
    }
    
    return sessionStore;
}

const session = expressSession({
    secret: environment.PROJECT_SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
        ...getCookieProps(),
        // Make the cookie expire when the client session ends
        maxAge: null,
        expires: null,
    },
    store: createSessionStore(),
})

module.exports = { createSessionStore, session };
