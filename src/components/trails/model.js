const mongoose = require('mongoose')
const { connect } = require('../../utils/db')
const { CLIENT_ID } = process.env

connect()

function ifEnabledAndHighlighted () { return this.enabled && this.highlighted }
function ifEnabledAndNotHighlighted () { return this.enabled && !this.highlighted }

const TrailSchema = new mongoose.Schema({
    enabled: { type: Boolean, default: false },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    mandatory: { type: Array, default: [] },
    highlighted: { type: Boolean, default: false },
    level: { type: String, enum: ['basic', 'intermediate', 'advanced'] },
    showcase: { tyoe: Boolean, default: false },
    thumbPath: { type: String, required: ifEnabledAndNotHighlighted },
    backgroundPath: { type: String },
    bannerPath: { type: String, required: ifEnabledAndHighlighted },
    expirationType: { type: Object },
    items: {
        type: [{
            itemID: { type: 'ObjectId', ref: 'Item' },
            urlItem: { type: String, required: false, default: null },
            urlTrail: { type: String, required: false, default: null },
            mandatory: { type: Boolean, default: false },
        }],
        default: [],
    },
    items_new: {
        type: [{
            itemID: { type: 'ObjectId', ref: 'Item' },
            urlItem: { type: String, required: false, default: null },
            urlTrail: { type: String, required: false, default: null },
        }],
        default: [],
    },
    startDate: { type: Date },
    endDate: { type: Date },
    tags: { type: Array },
    completion: { type: Number, default: null },
    certificate: { type: Number, default: 0 },
    isSequenceEnabled: { type: Boolean, default: false, required: true },
    createdAt: { type: Date },
    updatedAt: { type: Date },
    clientId: { type: Number, default: CLIENT_ID },
}, {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
})

TrailSchema.index({
    title: 'text',
    description: 'text',
})

const Trail = mongoose.model('Trail', TrailSchema)

module.exports = {
    Trail,
}
