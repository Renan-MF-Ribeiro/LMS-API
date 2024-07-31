const mongoose = require('mongoose')
const { connect } = require('../../utils/db')

connect()

const optionsSchema = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}

const logSchema = new mongoose.Schema({
    user: { type: 'ObjectId', ref: 'users', required: false },
    type: { type: String, required: false, trim: true },
    message: { type: String, required: false, trim: true },
    component: { type: String, required: false, trim: true },
    route: { type: String, required: false, trim: true },
    dataNew: { type: Array, required: false, default: [] },
    dataOld: { type: Array, required: false, default: [] },
    ip: { type: String },
    login: { type: String },
    groups: { type: Array, required: false, default: [] },
    deviceType: { type: String, require: false },
    browserDetails: { type: Object, require: false }
}, {
    ...optionsSchema,
})

const AverageCoursesSchema = new mongoose.Schema({
    store: { type: Object, required: true },
    average: { type: Number, required: true },
})

const AverageRatingSchema = new mongoose.Schema({
    store: { type: Object, required: true },
    average: { type: Number, required: true },
})

const logTestSchema = new mongoose.Schema({
    user: { type: 'ObjectId', ref: 'users', required: false },
    type: { type: String, required: false, trim: true },
    message: { type: String, required: false, trim: true },
    component: { type: String, required: false, trim: true },
    route: { type: String, required: false, trim: true },
    dataNew: { type: Array, required: false, default: [] },
    dataOld: { type: Array, required: false, default: [] },
    ip: { type: String },
    login: { type: String },
    groups: { type: Array, required: false, default: [] },
}, {
    ...optionsSchema,
})

logSchema.index({
    message: 'text',
})

const AverageCourses = mongoose.model('average_courses', AverageCoursesSchema)
const AverageRating = mongoose.model('average_rating', AverageRatingSchema)
const Log = mongoose.model('logs', logSchema)
const LogTest = mongoose.model('logs_test', logTestSchema)

module.exports = {
    Log,
    AverageCourses,
    AverageRating,
    LogTest,
}
