const mongoose = require('mongoose')
const { connect } = require('../../utils/db')
connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}

const authOptions = new mongoose.Schema({
    _id: false,
    key: { type: String },
    type: { type: String, enum: ['api_key', 'bearer'] }
})

const webhooksSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
    status: { type: Boolean, default: true, },
    label: { type: String },
    endpoint: { type: String },
    target: { type: String },
    action: { type: String },
    auth: { type: authOptions },
}, {
    ...schemaOptions,
})

const Webhooks = mongoose.model('webhooks', webhooksSchema)

module.exports = {
    Webhooks,
}
