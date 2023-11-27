const mongoose = require('mongoose')
const { connect } = require('../../../utils/db')
const { Showcase } = require('../configuration/model')
connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}




const depositions_ShowcaseSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    colorTitle: { type: String, required: true, trim: true },
    background: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true, trim: true },
    cardColors: {
        type: {
            color: { type: String, required: true },
            background: { type: String, required: true }
        }
    },
    depositions: {
        type: [{
            id: { type: String, required: false },
            profile: { type: String, required: false },
            name: { type: String, required: false },
            company: { type: String, required: false },
            deposition: { type: String, required: false },
            enabled: { type: Boolean, required: false },
        }]
    },
    cta: {
        type: {
            active: { type: Boolean, required: true, trim: true },
            color: { type: String, required: false, trim: true },
            background: { type: String, required: false, trim: true },
            label: { type: String, required: false, trim: true },
            link: { type: String, required: false, trim: true },
        }
    }
}, {
    ...schemaOptions,
})

const Depositions_Showcase = Showcase.discriminator('depositions_showcase', depositions_ShowcaseSchema)

module.exports = {
    Depositions_Showcase,
}
