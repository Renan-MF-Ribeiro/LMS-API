const mongoose = require('mongoose')

const { connect } = require('../../utils/db')

connect()

const ChatbotLogSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
    channel: { type: mongoose.Schema.Types.ObjectId, required: false },
    trail: { type: mongoose.Schema.Types.ObjectId, required: false },
    body: { type: mongoose.Schema.Types.Mixed, required: false },
    response: { type: mongoose.Schema.Types.Mixed, required: false },
    apiBody: { type: mongoose.Schema.Types.Mixed, required: false },
    apiResponse: { type: mongoose.Schema.Types.Mixed, required: false },
    messageId: { type: String, required: false },
    threadId: { type: String, required: false },
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
