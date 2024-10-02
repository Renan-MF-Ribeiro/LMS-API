const mongoose = require('mongoose')
const { connect } = require('../../../utils/db')
connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}


const brandingSchema = new mongoose.Schema({
    title: { type: String, required: true },
    favicon: { type: String, required: false },
}, {
    ...schemaOptions,
})

const Branding = mongoose.model('branding', brandingSchema)

module.exports = {
    Branding,
}
