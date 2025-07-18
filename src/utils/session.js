const expressSession = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');

const { log } = require('./logger');
const { getConnectionString, getDbOptions } = require('./db');
const { getCookieProps } = require('./cookies');
const environment = require('../environment');

const sessionMaxAge = environment.SESSION_MAX_AGE;

const sessionStore = MongoStore.create({
    client: mongoose.connection.getClient(),
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
    store: sessionStore,
})

module.exports = { sessionStore, session };
