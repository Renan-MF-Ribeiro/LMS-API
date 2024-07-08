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
    MOST_VIEWED: 'most_viewed'
});

const CARD_TYPE = Object.freeze({
    progressBarCard: 0,
    topTenCard: 1,
    defaultCard: 2,
    inPersonTraining: 3,
    topTenSlimCard: 4,
});

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
        trails: { type: [{ type: 'ObjectId', ref: 'trails' }] },
        position: { type: Number, default: 0 },
        ordination: { type: Number, required: false }, // 0 - DATA / 1 - ORDEM ALFABÉTICA
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
