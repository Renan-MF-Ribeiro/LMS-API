const mongoose = require('mongoose')
const { connect } = require('../../../utils/db')
const { Showcase } = require('../configuration/model')
connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}



const selection_ShowcaseSchema = new mongoose.Schema({

    trails: { type: [] }

}, {
    ...schemaOptions,
})

const Selection_Showcase = Showcase.discriminator('selection_showcase', selection_ShowcaseSchema)

module.exports = {
    Selection_Showcase,
}
