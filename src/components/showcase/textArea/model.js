const mongoose = require('mongoose')
const { connect } = require('../../../utils/db')
const { Showcase } = require('../configuration/model')
connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}


const DEFAULT_TYPES = Object.freeze({
    TEXT: 'text',
    LEFT: 'left',
    RIGHT: 'right'
})



const textArea_ShowcaseSchema = new mongoose.Schema({

    alignment: { type: String, enum: Object.values(DEFAULT_TYPES), required: true, trim: true },
    html: { type: String, required: true, trim: true },
    imgPath: { type: String, required: false, trim: true },

}, {
    ...schemaOptions,
})

const TextArea_Showcase = Showcase.discriminator('textArea_showcase', textArea_ShowcaseSchema)

module.exports = {
    TextArea_Showcase,
}
