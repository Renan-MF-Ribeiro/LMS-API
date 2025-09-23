const mongoose = require('mongoose')
const { connect } = require('../../../utils/db')
connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}

const target = Object.freeze({
    Banner: 'Banner',
    Logo: 'Logo',
    LogoAdmin: 'LogoAdmin',
    LogoLogin: 'LogoLogin',
    Background: 'Background',
})

const myGallerySchema = new mongoose.Schema({
    deletedAt: { type: Date, default: null },
    url: { type: String, required: true },
}, {
    ...schemaOptions,
})

const MyGallery = mongoose.model('myGallery', myGallerySchema)

module.exports = {
    MyGallery,
    target
}
