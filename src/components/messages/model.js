const mongoose = require('mongoose')
const { connect } = require('../../utils/db')

connect()

const MessageSchema = new mongoose.Schema({
    category: { type: String, required: true },
    communication: { type: Array, required: true },
    title: { type: String, required: true },
    text: { type: String, required: true },
    target: { type: Object },
    mode: { type: String, required: true },
    texthtml: { type: String, required: true },
}, { timestamps: true })

const Message = mongoose.model('Message', MessageSchema)

module.exports = { Message }
