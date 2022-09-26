const mongoose = require('mongoose')
const { connect } = require('../../utils/db')

connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}

const TrackingSchema = new mongoose.Schema({
    item: { type: 'ObjectId', ref: 'Item', required: true },
    sessionTime: { type: Number, required: true },
    totalTime: { type: Number, required: true, defaultValue: 0 },
    userLogin: { type: String, required: true },
    lastState: { type: String, required: true },
    isAllowedToSendXAPI: { type: Boolean, required: false },
    isXAPICompleteSent: { type: Boolean, required: false },
    completionAt: { type: Date, required: true, default: null },
}, {
    ...schemaOptions,
    discriminatorKey: 'kind',
})

TrackingSchema.index({
    userLogin: 'text',
})

const Tracking = mongoose.model('Tracking', TrackingSchema)

const DocumentTracking = Tracking.discriminator('DocumentTracking', new mongoose.Schema({
    completion: { type: Number, min: 0, max: 1 },
}, {
    ...schemaOptions,
}))

const MediaTracking = Tracking.discriminator('MediaTracking', new mongoose.Schema({
    completion: { type: Number, min: 0, max: 1 },
}, {
    ...schemaOptions,
}))

const AudioTracking = Tracking.discriminator('AudioTracking', new mongoose.Schema({
    completion: { type: Number, min: 0, max: 1 },
}, {
    ...schemaOptions,
}))

const EventTracking = Tracking.discriminator('EventTracking', new mongoose.Schema({
    clickedStatus: [{ id: String, title: String, completion: Boolean }], default: [],
    completion: { type: Number, min: 0, max: 1 },
}, {
    ...schemaOptions,
}))

const SCORMLessonStatus = Object.freeze({
    NOT_ATTEMPTED: 'not attempted',
    BROWSED: 'browsed',
    INCOMPLETE: 'incomplete',
    COMPLETED: 'completed',
    FAILED: 'failed',
    PASSED: 'passed',
})

const SCORMTracking = Tracking.discriminator('SCORMTracking', new mongoose.Schema({
    lessonStatus: { type: String, enum: Object.values(SCORMLessonStatus), default: SCORMLessonStatus.NOT_ATTEMPTED },
    suspendData: { type: String },
    score: { type: Number, min: 0, max: 100 },
}, {
    ...schemaOptions,
}))

const ExamTracking = Tracking.discriminator('ExamTracking', new mongoose.Schema({
    lessonStatus: { type: String, enum: Object.values(SCORMLessonStatus), default: SCORMLessonStatus.NOT_ATTEMPTED },
    suspendData: { type: String },
    score: { type: Number, min: 0, max: 100 },
}, {
    ...schemaOptions,
}))

const SCORMTrackingHistory = mongoose.model('SCORMTrackingHistory', new mongoose.Schema({
    item: { type: 'ObjectId', ref: 'Item', required: true },
    tracking: { type: 'ObjectId', ref: 'Item', required: true },
    userLogin: { type: String, required: true },
    lessonStatus: { type: String, enum: Object.values(SCORMLessonStatus), default: SCORMLessonStatus.NOT_ATTEMPTED },
    score: { type: Number, min: 0, max: 100 },
}, {
    ...schemaOptions,
}))

const fileFormats = Object.freeze({
    COMPACT_FILES: 'compact_files'
})
const activityLessonStatus = Object.freeze({
    NOT_ATTEMPTED: 'not attempted',
    INCOMPLETE: 'incomplete',
    FAILED: 'failed',
    PASSED: 'passed',
})

const ActivityTracking = Tracking.discriminator('ActivityTracking', new mongoose.Schema({
    item: { type: 'ObjectId', ref: 'Item', required: true },
    format: { type: String, enum: Object.values(fileFormats), default: fileFormats.COMPACT_FILES, required: true },
    contentPath: { type: String, required: false  },
    completion: { type: Number, min: 0, max: 1 },
    score: { type: Number, min: 0, max: 100 },
    reviewerComment: { type: String },
    reviewer: { type: String },
    sentAt: { type: [{ type: Date }] },
    correctedAt: { type: [{ type: Date }] },
    lessonStatus: {
        type: String,
        enum: Object.values(activityLessonStatus),
        default: activityLessonStatus.NOT_ATTEMPTED,
        required: true
    }
}, {
    ...schemaOptions
}))

module.exports = {
    Tracking,
    DocumentTracking,
    MediaTracking,
    SCORMLessonStatus,
    SCORMTracking,
    SCORMTrackingHistory,
    ExamTracking,
    AudioTracking,
    EventTracking,
    ActivityTracking
}
