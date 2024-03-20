const mongoose = require('mongoose')
const { connect } = require('../../../utils/db')
const AutoIncrement = require('mongoose-sequence')(mongoose);
connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}

const loginSchema = new mongoose.Schema({
    _id: Number,
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
        singleUser: {
            type: { type: String },
            label: { type: String },
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
    _id: false,
    ...schemaOptions,
})

loginSchema.plugin(AutoIncrement, { id: 'login_theme', inc_field: '_id' });

const ThemeLogin = mongoose.model('login_theme', loginSchema)

module.exports = {
    ThemeLogin,
}
