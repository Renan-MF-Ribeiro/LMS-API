const mongoose = require('mongoose')
const { connect } = require('../../utils/db')

connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}

const OnboardingSchema = new mongoose.Schema({
    title: { type: String, require: true, trim: true },
    options: { type: Array, require: true },
    deleted: { type: Number, default: 0 },
    status: { type: Number, default: 1 },
    // type: { type: String, required: true },
    description: { type: String, required: false },
    tags: { type: Array, required: false },
    isEvaluationEnabled: { type: Boolean, default: false },
    daysOfApplication: { type: Number },
}, {
    ...schemaOptions,
})

const OnboardingHistorySchema = new mongoose.Schema({
    student: { type: 'ObjectId', ref: 'users', required: true },
    integrator: { type: 'ObjectId', ref: 'users', required: true },
    checklist: { type: 'ObjectId', ref: 'onboarding', require: true },
    options: { type: Array, required: true },
}, {
    ...schemaOptions,
})

OnboardingSchema.index({
    title: 'text',
})

const OnboardingModel = mongoose.model('onboarding', OnboardingSchema)
const OnboardingHistoryModel = mongoose.model('onboarding_history', OnboardingHistorySchema)

module.exports = {
    OnboardingModel,
    OnboardingHistoryModel,
}
