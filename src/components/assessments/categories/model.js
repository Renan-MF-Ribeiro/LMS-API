const mongoose = require('mongoose')
const { connect } = require('../../../utils/db')

connect()

const optionsSchema = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}

const CategoriesSchema = new mongoose.Schema({
    description: { type: String, required: true, trim: true },
    case: { type: { title: { type: String, required: true, trim: true }, description: { type: String, required: true, trim: true } }, required: false, trim: true },
    idEvaluation: { type: 'ObjectId', ref: 'evaluations' },
    active: { type: Number, default: 1 },
    randomQuestions: { type: Number, required: false, default: 0 }, // 0 - NÃO / 1 - SIM
    amountOfQuestions: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    deleted: { type: Number, default: 0 },

}, {
    ...optionsSchema,
})

const Category = mongoose.model('categories', CategoriesSchema)

module.exports = {
    Category,
}
