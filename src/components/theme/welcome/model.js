const { Theme } = require('../palette/model')
const mongoose = require('mongoose')
const { connect } = require('../../../utils/db')
connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}

const Welcome = Theme.discriminator(
    'welcome',
    new mongoose.Schema({
        welcomeVideo: { type: String },
    }, {
        ...schemaOptions,
    }
    )
)

module.exports = { Welcome };