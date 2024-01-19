const mongoose = require('mongoose')
const { connect } = require('../../../utils/db')

connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}

const loginSchema = new mongoose.Schema({
    buttons: {
        login: {
            bgColor: { type: String },
            textColor: { type: String },
            text: { type: String },
            tooltip: { type: String },
            hint: { type: String },
        },
        sso: {
            bgColor: { type: String },
            textColor: { type: String },
            text: { type: String },
            tooltip: { type: String },
            hint: { type: String },
        },
        recoveryPassword: {
            bgColor: { type: String },
            textColor: { type: String },
            text: { type: String },
            tooltip: { type: String },
            hint: { type: String },
        },
        singin: {
            bgColor: { type: String },
            textColor: { type: String },
            text: { type: String },
            tooltip: { type: String },
            hint: { type: String },
        },
    },
    inputs: {
        login: {
            type: { type: String },
            hint: { type: String },
            label: { type: String },
        },
        password: {
            type: { type: String },
            hint: { type: String },
            label: { type: String },
        },
    },
    background: { type: String },
    backgroundMobile: { type: String },
    logo: { type: String },
}, {
    ...schemaOptions,
})

const ThemeLogin = mongoose.model('theme_login', loginSchema)

module.exports = {
    ThemeLogin,
}
