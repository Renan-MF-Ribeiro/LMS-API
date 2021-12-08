const path = require('path')

const mongoose = require('mongoose')
const { anyPass, test } = require('ramda')
const { connect } = require('../../utils/db')
const { PUBLIC_PATH } = process.env

connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}

function ifEnabled () { return this.enabled }

const isURL = test(/^https?:\/\//)
const isLocalMedia = test(/^\/?(\w+\/)*[a-f0-9]{10}\.mp4$/)
const isLocalAudio = test(/^\/?(\w+\/)*[a-f0-9]{10}\.mp3$/)
const isYouTubeVideo = test(/^https:\/\/(www\.)?youtube\.com\//i)
const isVimeoVideo = test(/^https:\/\/((player|www)\.)?vimeo\.com\//i)

const pathResolver = p => isURL(p)
    ? p
    : path.relative(PUBLIC_PATH, p)

const endpointOptions = {
    isEndpointEnabled: { type: Boolean, default: false, required: true },
}

const ItemSchema = new mongoose.Schema({
    enabled: { type: Boolean, default: false, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: ifEnabled, trim: true },
    durationHours: { type: Number, required: ifEnabled },
    thumbPath: { type: String, get: pathResolver, required: ifEnabled, default: '' },
    deleted: { type: Number, default: 0 },
    completion: { type: Number, default: null },
    descriptionEvaluation: { type: String },
    author: { type: 'ObjectId', ref: 'users', required: true },
    collaborative: { type: Boolean, default: false },
    mobile: { type: Number, default: 1 },
    certificate: { type: Number, default: 0 },
    bannerPath: { type: String, required: false },
    highlighted: { type: Boolean, default: false },
    startDate: { type: Date },
    endDate: { type: Date },
    survey: { type: String, enum: ['required', 'optional', 'none'] },
}, {
    ...schemaOptions,
    discriminatorKey: 'kind',
})

ItemSchema.index({
    title: 'text',
    description: 'text',
})

const Item = mongoose.model('Item', ItemSchema)

const documentFormats = Object.freeze({
    PDF: 'pdf',
})

const DocumentItem = Item.discriminator('DocumentItem', new mongoose.Schema({
    format: { type: String, enum: Object.values(documentFormats), default: documentFormats.PDF, required: true },
    contentPath: { type: String, get: pathResolver, required: ifEnabled },
    ...endpointOptions,
}, {
    ...schemaOptions,
}))

const ExamItem = Item.discriminator('ExamItem', new mongoose.Schema({
    idEvaluation: { type: 'ObjectId', ref: 'evaluations', required: true },
    passingScore: { type: Number },
    contentPath: { type: String, required: false },
}, {
    ...schemaOptions,
}))

const mediaFormats = Object.freeze({
    VIDEO: 'video',
})

const MediaItem = Item.discriminator('MediaItem', new mongoose.Schema({
    format: { type: String, enum: Object.values(mediaFormats), default: mediaFormats.VIDEO, required: true },
    contentPath: {
        type: String,
        get: pathResolver,
        required: ifEnabled,
        validate: {
            validator: anyPass([isURL, isLocalMedia, isYouTubeVideo, isVimeoVideo]),
            message: props => `${props.value} não é um caminho válido ou uma URL suportada.`,
        },
    },
    ...endpointOptions,
}, {
    ...schemaOptions,
}))

const audioFormats = Object.freeze({
    AUDIO: 'audio',
})

const AudioItem = Item.discriminator('AudioItem', new mongoose.Schema({
    format: { type: String, enum: Object.values(audioFormats), default: audioFormats.AUDIO, required: true },
    contentPath: {
        type: String,
        get: pathResolver,
        required: true,
        validate: {
            validator: anyPass([isURL, isLocalMedia, isLocalAudio, isYouTubeVideo, isVimeoVideo]),
            message: props => `${props.value} não é um caminho válido ou uma URL suportada.`,
        },
    },
    ...endpointOptions,
}, {
    ...schemaOptions,
}))

const scormVersions = Object.freeze({
    SCORM_1_2: 'scorm_1_2',
})

const SCORMItem = Item.discriminator('SCORMItem', new mongoose.Schema({
    scormVersion: { type: String, enum: Object.values(scormVersions), default: scormVersions.SCORM_1_2, required: true },
    packageId: { type: 'ObjectId', required: true },
    scoId: { type: String, required: true },
    masteryScore: { type: Number },
    contentPath: { type: String, required: true },
    ...endpointOptions,
}, {
    ...schemaOptions,
}))

const SoundcloudItem = Item.discriminator('SoundcloudItem', new mongoose.Schema({
    format: { type: String, enum: Object.values(mediaFormats), default: mediaFormats.VIDEO, required: true },
    contentPath: {
        type: String,
        required: true,
    },
    ...endpointOptions,
}, {
    ...schemaOptions,
}))

module.exports = {
    Item,
    DocumentItem,
    MediaItem,
    SCORMItem,
    ExamItem,
    AudioItem,
    SoundcloudItem,
}
