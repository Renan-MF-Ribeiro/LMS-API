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
            label: { type: String },
            bgColor: { type: String },
            textColor: { type: String },
            border: { type: Number },
            text: { type: String },
            tooltip: { type: String },
            hint: { type: String },
        },
        sso: {
            label: { type: String },
            bgColor: { type: String },
            textColor: { type: String },
            border: { type: Number },
            text: { type: String },
            tooltip: { type: String },
            hint: { type: String },
        },
        recoveryPassword: {
            label: { type: String },
            bgColor: { type: String },
            textColor: { type: String },
            border: { type: Number },
            text: { type: String },
            tooltip: { type: String },
            hint: { type: String },
        },
        singin: {
            label: { type: String },
            bgColor: { type: String },
            textColor: { type: String },
            border: { type: Number },
            text: { type: String },
            tooltip: { type: String },
            hint: { type: String },
        },
        singleUser: {
            label: { type: String },
            bgColor: { type: String },
            textColor: { type: String },
            border: { type: Number },
            text: { type: String },
            tooltip: { type: String },
            hint: { type: String },
        },
        formAcess: {
            label: { type: String },
            bgColor: { type: String },
            textColor: { type: String },
            border: { type: Number },
            text: { type: String },
            tooltip: { type: String },
            hint: { type: String },
        },
        samlAcess: {
            label: { type: String },
            bgColor: { type: String },
            textColor: { type: String },
            border: { type: Number },
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
    cardColor: { type: String }
}, {
    ...schemaOptions,
})


const ThemeLogin = mongoose.model('login_theme', loginSchema)

module.exports = {
    ThemeLogin,
}
