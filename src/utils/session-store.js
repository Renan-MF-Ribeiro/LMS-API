const MongoStore = require('connect-mongo');

const { log } = require('./logger');
const { getConnectionString, getDbOptions } = require('./db');

const dbOptions = getDbOptions();

const sessionStore = MongoStore.create({
    mongoUrl: getConnectionString(),
    mongoOptions: {
        useNewUrlParser: dbOptions.useNewUrlParser,
        useUnifiedTopology: dbOptions.useUnifiedTopology
    },
    collectionName: 'sessions',
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

module.exports = { sessionStore };
