const { Theme } = require('../palette/model')
const mongoose = require('mongoose')
const { connect } = require('../../../utils/db')
connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}

const HeaderConfig = Theme.discriminator(
    'headerConfig',
    new mongoose.Schema({
        modulesInHeader: { type: Array, default: [], required: false },
        modulesInHeaderMobile: { type: Array, default: [], required: false },
    }, {
        ...schemaOptions,
    }
    )
)

module.exports = { HeaderConfig };