const { Theme } = require('../palette/model')
const mongoose = require('mongoose')
const { connect } = require('../../../utils/db')
connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}

const Menu = Theme.discriminator(
    'menu',
    new mongoose.Schema({
        button: { type: String },
        roles: { type: [String] },
        subMenu: { type: [this] },
        feature: { type: String },
    }, {
        ...schemaOptions,
    }))


module.exports = {
    Menu,
}
