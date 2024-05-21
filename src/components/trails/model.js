const mongoose = require('mongoose');
const { connect } = require('../../utils/db');
const { CLIENT_ID } = process.env;

connect();

function ifEnabledAndHighlighted () {
    return this.enabled && this.highlighted;
}
function ifEnabledAndNotHighlighted () {
    return this.enabled && !this.highlighted;
}
function ifInnerTextEnabled () {
    return this.innerTextStatus;
}

const ComplaintSchema = new mongoose.Schema(
    {
        reason: { type: String },
    },
    { timestamps: true }
);

const TrailSchema = new mongoose.Schema(
    {
        enabled: { type: Boolean, default: false },
        title: { type: String, required: true, trim: true },
        titleURL: { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },
        mandatory: { type: Array, default: [] },
        highlighted: { type: Boolean, default: false },
        level: { type: String, enum: ['basic', 'intermediate', 'advanced'] },
        showcase: { type: Boolean, default: false },
        collaborative: { type: Boolean, default: false },
        certificateLayout: { type: 'ObjectId' },
        author: { type: 'ObjectId', ref: 'users', required: true },
        thumbPath: { type: String, required: ifEnabledAndNotHighlighted },
        backgroundPath: { type: String, required: false },
        bannerPath: { type: String, required: ifEnabledAndHighlighted },
        expirationType: { type: Object },
        complaints: [ComplaintSchema],
        moderation: {
            type: String,
            enum: ['pending', 'approved', 'disapproved', 'denounced'],
        },
        separators: {
            type: [
                {
                    _id: { type: String },
                    kind: { type: String, required: true },
                    title: { type: String, required: true },
                    items: {
                        type: [{ type: 'ObjectId', ref: 'Item' }],
                        default: [],
                    },
                },
            ],
        },
        items: {
            type: [
                {
                    itemID: { type: 'ObjectId', ref: 'Item' },
                    urlItem: { type: String, required: false, default: null },
                    urlTrail: { type: String, required: false, default: null },
                    mandatory: { type: Boolean, default: false },
                    chief: { type: Boolean, default: false },
                    optional: { type: Boolean, default: false },
                    afterSeparator: {
                        type: String,
                        required: false,
                        default: null,
                    },
                },
            ],
            default: [],
        },
        items_new: {
            type: [
                {
                    itemID: { type: 'ObjectId', ref: 'Item' },
                    urlItem: { type: String, required: false, default: null },
                    urlTrail: { type: String, required: false, default: null },
                },
            ],
            default: [],
        },
        startDate: { type: Date },
        endDate: { type: Date },
        tags: { type: Array },
        tagsAnd: { type: Array, required: false },
        completion: { type: Number, default: null },
        certificate: { type: Number, default: 0 },
        isSequenceEnabled: {
            type: String,
            enum: ['NONE', 'ALL', 'EXAME'],
            default: 'NONE',
            required: true,
        },
        createdAt: { type: Date },
        updatedAt: { type: Date },
        externalPlayer: {
            type: String,
            enum: ['NONE', 'ALL', 'FIRST_ITEM'],
            default: 'NONE',
        },
        clientId: { type: Number, default: CLIENT_ID },
        innerTextStatus: { type: Boolean, default: false },
        innerTextBanner: { type: String, required: false, default: null },
        innerText: { type: String, required: ifInnerTextEnabled },
        certificateDue: { type: Object, default: null },
        expirationDate: { type: Date, default: null },
        supportMaterial: { type: Array },
        isPadletEnabled: { type: Boolean, default: false },
        archive: { type: Boolean, required: false, default: false },
        archivedAt: { type: Date, required: false, default: null },
    },
    {
        strict: 'throw',
        timestamps: true,
        collation: { locale: 'en_US', strength: 1 },
    }
);

TrailSchema.index({
    title: 'text',
    titleURL: 'text',
    description: 'text',
});

const Trail = mongoose.model('Trail', TrailSchema);

const vwTrailsItems = new mongoose.Schema({
    enabled: { type: Boolean, default: false },
    title: { type: String, required: true, trim: true },
    titleURL: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    mandatory: { type: Array, default: [] },
    highlighted: { type: Boolean, default: false },
    level: { type: String, enum: ['basic', 'intermediate', 'advanced'] },
    showcase: { type: Boolean, default: false },
    collaborative: { type: Boolean, default: false },
    certificateLayout: { type: 'ObjectId' },
    author: { type: 'ObjectId', ref: 'users', required: true },
    thumbPath: { type: String, required: ifEnabledAndNotHighlighted },
    backgroundPath: { type: String, required: false },
    bannerPath: { type: String, required: ifEnabledAndHighlighted },
    expirationType: { type: Object },
    complaints: [ComplaintSchema],
    moderation: {
        type: String,
        enum: ['pending', 'approved', 'disapproved', 'denounced'],
    },
    items: {
        type: [
            {
                itemID: { type: 'ObjectId', ref: 'Item' },
                urlItem: { type: String, required: false, default: null },
                urlTrail: { type: String, required: false, default: null },
                mandatory: { type: Boolean, default: false },
                chief: { type: Boolean, default: false },
                optional: { type: Boolean, default: false },
            },
        ],
        default: [],
    },
    items_new: {
        type: [
            {
                itemID: { type: 'ObjectId', ref: 'Item' },
                urlItem: { type: String, required: false, default: null },
                urlTrail: { type: String, required: false, default: null },
            },
        ],
        default: [],
    },
    startDate: { type: Date },
    endDate: { type: Date },
    tags: { type: Array },
    completion: { type: Number, default: null },
    certificate: { type: Number, default: 0 },
    isSequenceEnabled: {
        type: String,
        enum: ['NONE', 'ALL', 'EXAME'],
        default: 'NONE',
        required: true,
    },
    createdAt: { type: Date },
    updatedAt: { type: Date },
    externalPlayer: {
        type: String,
        enum: ['NONE', 'ALL', 'FIRST_ITEM'],
        default: 'NONE',
    },
    clientId: { type: Number, default: CLIENT_ID },
    innerTextStatus: { type: Boolean, default: false },
    innerText: { type: String, required: ifInnerTextEnabled },
});

const TrailsItems = mongoose.model(
    'vwTrailsItems',
    vwTrailsItems,
    'vwTrailsItems'
);

const vwTrailsTagsWithUsersAndTrackings = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    items: {
        type: [
            {
                itemID: { type: 'ObjectId', ref: 'Item' },
                urlItem: { type: String, required: false, default: null },
                urlTrail: { type: String, required: false, default: null },
                mandatory: { type: Boolean, default: false },
                chief: { type: Boolean, default: false },
                optional: { type: Boolean, default: false },
            },
        ],
        default: [],
    },
    tags: { type: Array },
    groups: { type: Array },
    user: {
        type: {
            name: { type: String, required: true },
            networkLogin: { type: String, required: false, default: null },
            sendInBlueAccept: { type: Boolean, required: false, default: true },
            email: { type: String, required: true },
            createdAt: { type: Date },
        },
        required: true,
    },
    trackings: { type: Array },
});
const TrailsTagsWithUsersAndTrackings = mongoose.model(
    'vwTrailsTagsWithUsersAndTrackings',
    vwTrailsTagsWithUsersAndTrackings,
    'vwTrailsTagsWithUsersAndTrackings'
);

module.exports = {
    Trail,
    TrailsItems,
    TrailsTagsWithUsersAndTrackings
};
