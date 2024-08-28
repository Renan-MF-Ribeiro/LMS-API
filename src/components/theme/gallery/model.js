const mongoose = require('mongoose')
const { connect } = require('../../../utils/db')
connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}


const myGallerySchema = new mongoose.Schema({
    url: { type: String, required: true },
    target: { type: String, required: true },
    default: { type: Boolean, required: false, default: false },
}, {
    ...schemaOptions,
})

const MyGallery = mongoose.model('myGallery', myGallerySchema)

module.exports = {
    MyGallery,
}
