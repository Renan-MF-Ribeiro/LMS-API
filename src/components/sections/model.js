const mongoose = require('mongoose');
const { connect } = require('../../utils/db');

connect();

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
};

const DEFAULT_TYPES = Object.freeze({
    MANDATORY: 'mandatory',
    RECENTS: 'recents',
    KEEP_LEARNING: 'keep_learning',
    CONCLUDED: 'concluded',
    COURSES: 'courses',
    FAVORITES: 'favorites',
    MOST_SEEN: 'most_seen'
});

const CARD_TYPE = Object.freeze({
    progressBarCard: 0,
    topTenCard: 1,
    defaultCard: 2,
    inPersonTraining: 3,
    topTenSlimCard: 4,
});

const certificateDueSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['fixed', 'availability', ''],
            required: false,
        },
        value: { type: mongoose.Schema.Types.Mixed, required: true }, // Number or Date
    },
    { _id: false }
);

const SectionSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },
        tags: { type: Array, required: true },
        default: { type: Boolean, default: false },
        showcase: { tyoe: Boolean, default: false },
        order: { type: Number, default: 0 },
        deleted: { type: Number, default: 0 },
        active: { type: Number, default: 1 },
        formation: { type: Number, default: 0 },
        certificate: { type: Number, default: 0 },
        trails: { type: mongoose.Schema.Types.Mixed },
        position: { type: Number, default: 0 },
        ordination: { type: Number, required: false }, // 0 - DATA / 1 - ORDEM ALFABÉTICA
        isTraining: { type: Boolean, required: false },
        certificateLayout: { type: 'ObjectId', required: false },
        certificateDue: { type: certificateDueSchema, required: false },
        completedTrailsType: { type: String, required: false, default: null }, // optional | hidden
        displayType: { type: String, required: false, default: null }, // optional | hidden
        exceptionCertificateTrails: { type: [{ type: 'ObjectId', ref: 'trails' }], required: false, default: [] },
        defaultType: {
            type: String,
            enum: Object.values(DEFAULT_TYPES),
            required: false,
        },
        cardType: {
            type: Number,
            enum: Object.values(CARD_TYPE),
            required: false,
            trim: true
        }
    },
    {
        ...schemaOptions,
    }
);

const Section = mongoose.model('sections', SectionSchema);

module.exports = {
    Section,
    DEFAULT_TYPES,
};
