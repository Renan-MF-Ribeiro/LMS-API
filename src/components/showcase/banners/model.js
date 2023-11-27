const mongoose = require('mongoose')
const { connect } = require('../../../utils/db')
const { Showcase } = require('../configuration/model')
connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}

Showcase

const banners_ShowcaseSchema = new mongoose.Schema({
    banners: {
        type: [{
            _id: { type: String, required: false },
            path: { type: String, required: true, trim: true },
            startDate: { type: Date, required: true, trim: true, },
            endDate: { type: Date, required: true, trim: true },
            link: { type: String, trim: true },
        }]
    }
}, {
    ...schemaOptions,
})

const Banners_Showcase = Showcase.discriminator('Banners_Showcase', banners_ShowcaseSchema)

module.exports = {
    Banners_Showcase,
}
