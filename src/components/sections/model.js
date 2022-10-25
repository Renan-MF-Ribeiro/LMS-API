const mongoose = require('mongoose')
const { connect } = require('../../utils/db')

connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}

const SectionSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    tags: { type: Array, required: true },
    default: { type: Boolean, default: false },
    showcase: { tyoe: Boolean, default: false },
    order: { type: Number, default: 0 },
    deleted: { type: Number, default: 0 },
    active: { type: Number, default: 1 },
    trails: { type: Array, required: false, default: [] },
    position: { type: Number, default: 0 },
    ordination: { type: Number, required: false }, // 0 - DATA / 1 - ORDEM ALFABÉTICA
    trails: { type: Array, default: [] }
}, {
    ...schemaOptions,
})

const Section = mongoose.model('sections', SectionSchema)

module.exports = {
    Section,
}
