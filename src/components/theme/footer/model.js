const mongoose = require('mongoose')
const { connect } = require('../../../utils/db')
connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}


const footerSchema = new mongoose.Schema({
    html: { type: String },
    css: { type: String },
}, {
    ...schemaOptions,
})

const Footer = mongoose.model('footer', footerSchema)

module.exports = {
    Footer,
}
