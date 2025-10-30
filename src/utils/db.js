
require('dotenv').config()
const mongoose = require('mongoose')

const { error } = require('./logger')
const environment = require('../environment')

const { DB_USER, DB_PASSWORD, DB_HOST, DB_NAME } = environment

function getDbOptions() {
    return {
        useNewUrlParser: true,
        useFindAndModify: false,
        useCreateIndex: true,
        useUnifiedTopology: true,
    };
}

function getConnectionString() {
    const connStr = !DB_USER ? DB_HOST : `${DB_USER}:${DB_PASSWORD}@${DB_HOST}/${DB_NAME}`;

    return connStr.startsWith('mongodb://') || connStr.startsWith('mongodb+srv://')
        ? connStr
        : `mongodb://${connStr}`;
}

module.exports = {
    getDbOptions,
    getConnectionString,

    // For compatibility with old code, but should not be used in new code
    async connect() {},

    async connectDatabase(databaseOptions = {}) {
        try {
            const strConn = getConnectionString();

            return await mongoose.connect(strConn, { dbName: DB_NAME, ...getDbOptions(), ...databaseOptions })
        } catch (err) {
            error(err)
        }
    },
}
