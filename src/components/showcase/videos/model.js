const mongoose = require('mongoose')
const { connect } = require('../../../utils/db')
const { Showcase } = require('../configuration/model')
connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}



const videos_ShowcaseSchema = new mongoose.Schema({
    length: { type: Number },
    videos: {
        type: [{
            path: { type: String, required: true, trim: true },
            link: { type: String, required: true, trim: true },
        }]
    },

}, {
    ...schemaOptions,
})

const Videos_Showcase = Showcase.discriminator('videos_showcase', videos_ShowcaseSchema)

module.exports = {
    Videos_Showcase,
}
