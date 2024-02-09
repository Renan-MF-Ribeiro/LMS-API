const mongoose = require('mongoose')
const { connect } = require('../../../utils/db')

connect()

const optionsSchema = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}

const QuestionsSchema = new mongoose.Schema({
    idCategory: { type: 'ObjectId', ref: 'categories' },
    idEvaluation: { type: 'ObjectId', ref: 'evaluations' },
    description: { type: String, required: true, trim: true },
    alternatives: { type: [{ type: 'ObjectId', ref: 'alternatives' }] },
    rigthAnswer: { type: 'ObjectId', ref: 'alternatives' },
    active: { type: Number, required: false, default: 1 },
    repealed: { type: Number, required: false, default: 0 },
    deleted: { type: Number, default: 0 },
    number: { type: Number, default: 0 },
    feedback: {
        type: { positive: { type: String, required: true }, negative: { type: String, required: true } },
        required: false
    }
}, {
    ...optionsSchema,
})

const vwQuestionsSchema = new mongoose.Schema({
    idCategory: { type: 'ObjectId', ref: 'categories' },
    idEvaluation: { type: 'ObjectId', ref: 'evaluations' },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    alternatives: { type: [{ type: 'Object', ref: 'alternatives' }] },
    rigthAnswer: { type: 'ObjectId', ref: 'alternatives' },
    active: { type: Number, required: false, default: 1 },
    repealed: { type: Number, required: false, default: 0 },
    deleted: { type: Number, default: 0 },
    number: { type: Number, default: 0 },
}, {
    strict: 'throw',
    timestamps: true,
})

const Question = mongoose.model('questions', QuestionsSchema)

const QuestionsAlternatives = mongoose.model('vwQuestionsAlternatives', vwQuestionsSchema, 'vwQuestionsAlternatives')

module.exports = {
    Question,
    QuestionsAlternatives
}
