const mongoose = require('mongoose')
const { connect } = require('../../utils/db')

connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}

const DashConfigSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    fields: {
        type: [],
        default: [],
    },
    pages: {
        type: [],
        default: [],
    },
}, schemaOptions)

const DashConfig = mongoose.model('DashConfig', DashConfigSchema)

module.exports = { DashConfig }
