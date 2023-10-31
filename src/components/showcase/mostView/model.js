const mongoose = require('mongoose')
const { connect } = require('../../../utils/db')
const { Showcase } = require('../configuration/model')
connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}



const mostView_ShowcaseSchema = new mongoose.Schema({
    trails: { type: [] }

}, {
    ...schemaOptions,
})

const MostView_Showcase = Showcase.discriminator('mostView_showcase', mostView_ShowcaseSchema)

module.exports = {
    MostView_Showcase,
}
