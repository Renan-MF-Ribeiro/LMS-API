const mongoose = require('mongoose')
const { connect } = require('../../../utils/db')
const { Showcase } = require('../configuration/model')
connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}




const imageArea_ShowcaseSchema = new mongoose.Schema({
    imgPath: { type: String, required: false, trim: true },

}, {
    ...schemaOptions,
})

const ImageArea_Showcase = Showcase.discriminator('imageArea_showcase', imageArea_ShowcaseSchema)

module.exports = {
    ImageArea_Showcase,
}
