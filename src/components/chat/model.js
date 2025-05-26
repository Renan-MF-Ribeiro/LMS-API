const mongoose = require('mongoose')

const { connect } = require('../../utils/db')

connect()

const ChatbotLogSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
    channel: { type: mongoose.Schema.Types.ObjectId, required: false },
    trail: { type: mongoose.Schema.Types.ObjectId, required: false },
    body: { type: String, required: false },
    response: { type: String, required: false },
    apiBody: { type: String, required: false },
    apiResponse: { type: String, required: false },
    messageId: { type: String, required: false },
    messageFeedback: { type: Number, required: false, default: null },
    error: { type: String, required: false },
}, {
    strict: false,
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
})

ChatbotLogSchema.index({ messageId: 1 }, { unique: false })

const ChatbotLog = mongoose.model('chatbot_logs', ChatbotLogSchema)

module.exports = { ChatbotLog }
