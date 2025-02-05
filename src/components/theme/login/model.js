const mongoose = require('mongoose')
const { connect } = require('../../../utils/db')
const { Strategy } = require('passport-saml')
connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}

const buttonSchema = new mongoose.Schema({
    label: { type: String },
    bgColor: { type: String },
    textColor: { type: String },
    border: { type: Number },
    text: { type: String },
    tooltip: { type: String },
    hint: { type: String },
})

const inputSchema = new mongoose.Schema({
    type: { type: String },
    hint: { type: String },
    label: { type: String },
})

const loginSchema = new mongoose.Schema({
    buttons: {
        login: buttonSchema,
        singleSignOn: [{
            strategyName: { type: String },
            button: buttonSchema
        }],
        recoveryPassword: buttonSchema,
        singin: buttonSchema,
        singleUser: buttonSchema,
        formAcess: buttonSchema,
        samlAcess: buttonSchema,
    },
    inputs: {
        login: inputSchema,
        password: inputSchema,
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
