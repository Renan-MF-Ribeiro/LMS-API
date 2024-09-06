const mongoose = require('mongoose')
const { connect } = require('../../../utils/db')
const { Showcase } = require('../configuration/model')
connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}


const dynamicSectionSchema = new mongoose.Schema({
    html: { type: String },
    css: { type: String },
}, {
    ...schemaOptions,
})


const DynamicSection = Showcase.discriminator('dynamicSection', dynamicSectionSchema)

module.exports = {
    DynamicSection,
}
