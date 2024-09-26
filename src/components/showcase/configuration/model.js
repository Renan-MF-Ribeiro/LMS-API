const mongoose = require('mongoose')
const { connect } = require('../../../utils/db')

connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}

const DEFAULT_TYPES = Object.freeze({
    banners: "banners",
    videos: "videos",
    mostSeen: "mostSeen",
    selection: "selection",
    text: "text",
    image: "image",
    depositions: "depositions",
    dynamicSection: "DynamicSection",
})

const showcaseSchema = new mongoose.Schema({
    title: { type: String, required: false, trim: true },
    type: { type: String, enum: Object.values(DEFAULT_TYPES), required: true, trim: true },
    position: { type: Number, required: true, trim: true, default: 0 },
    colorTitle: { type: String, required: false, trim: true },
    background: { type: String, required: false, trim: true },
    enabled: { type: Boolean, required: true, trim: true, default: true },
    partners: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'partners',
        }], required: false, trim: true
    },
    cta: {
        type: {
            active: { type: Boolean, required: false, trim: true, default: false },
            color: { type: String, required: false, trim: true },
            background: { type: String, required: false, trim: true },
            label: { type: String, required: false, trim: true },
            link: { type: String, required: false, trim: true },
        }
    }
}, {
    ...schemaOptions,
})

const Showcase = mongoose.model('sections_showcase', showcaseSchema)

module.exports = {
    Showcase,
    DEFAULT_TYPES,
}
