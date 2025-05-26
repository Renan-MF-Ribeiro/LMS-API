const mongoose = require('mongoose')
const { connect } = require('../../utils/db')

connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}

const CHANNEL_TYPES = Object.freeze({
    alura: "alura",
    mentoring: "mentoring"
})

const ChannelSchema = new mongoose.Schema({
    title: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    tags: { type: Array },
    banners: { type: Array },
    position: { type: Number, default: 0 },
    idSections: { type: [{ type: 'ObjectId', ref: 'sections' }] },
    theme: { type: 'ObjectId', ref: 'theme', required: false },
    type: { type: String, enum: Object.values(CHANNEL_TYPES), required: false, trim: true },
    owner: { type: String }
}, {
    ...schemaOptions,
})

const Channel = mongoose.model('channel', ChannelSchema)

module.exports = {
    Channel,
}
