
require('dotenv').config()
const mongoose = require('mongoose')
const { error } = require('./logger')
const { DB_USER, DB_PASSWORD, DB_HOST, DB_NAME } = process.env

mongoose.set('useNewUrlParser', true)
mongoose.set('useFindAndModify', false)
mongoose.set('useCreateIndex', true)
mongoose.set('useUnifiedTopology', true)

module.exports = {
    async connect () {
        try {
            if (DB_USER == '') {
                strConn = `mongodb://${DB_HOST}`
            } else {
                strConn = `mongodb://${DB_USER}:${DB_PASSWORD}@${DB_HOST}/${DB_NAME}`
            }

            return mongoose.connect(strConn, { useNewUrlParser: true, autoReconnect: true })
        } catch (err) {
            error(err)
        }
    },
}
