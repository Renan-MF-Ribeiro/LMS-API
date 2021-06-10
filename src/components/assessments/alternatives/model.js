const mongoose = require('mongoose')
const { connect } = require('../../../utils/db')

connect()

const optionsSchema = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}

const AlternativesSchema = new mongoose.Schema({
    description: { type: String, required: true, trim: true, maxlength: 500 },
    active: { type: Number, default: 1 },
    idQuestion: { type: 'ObjectId', ref: 'questions' },
    deleted: { type: Number, default: 0 },
    correct: { type: Boolean, default: false },
}, {
    ...optionsSchema,
})

const Alternative = mongoose.model('alternatives', AlternativesSchema)

module.exports = {
    Alternative,
}
