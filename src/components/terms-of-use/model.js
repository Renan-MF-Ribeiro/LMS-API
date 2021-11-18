const mongoose = require('mongoose')
const { connect } = require('../../utils/db')

connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}

const TermsOfUseSchema = new mongoose.Schema({
    content: { type: String, required: true },
    category: { type: String, required: true, enum: ['collaboration', 'privacy-policy'] },
}, schemaOptions)

const TermsOfUse = mongoose.model('TermsOfUse', TermsOfUseSchema)

module.exports = { TermsOfUse }
