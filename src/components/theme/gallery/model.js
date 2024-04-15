const mongoose = require('mongoose')
const { connect } = require('../../../utils/db')
connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}


const gallerySchema = new mongoose.Schema({
    path: { type: String, required: true },
    title: { type: String, required: true },
}, {
    ...schemaOptions,
})

const Gallery = mongoose.model('gallery', gallerySchema)

module.exports = {
    Gallery,
}
