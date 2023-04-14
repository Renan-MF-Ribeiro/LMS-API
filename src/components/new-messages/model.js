const mongoose = require('mongoose')
const { connect } = require('../../utils/db')

connect()

const NewMessageSchema = new mongoose.Schema({
    category: { type: String },
    communication: { type: Array },
    title: { type: String },
    text: { type: String },
    target: { type: Object },
    mode: { type: String },
    texthtml: { type: String },
    status: { type: String },
    isListProcessed: { type: Boolean, default: false },
    creatorId: { type: String, required: false },
    appliedFilters: { type: Object, required: true },
}, { timestamps: true })

const MessagingListSchema = new mongoose.Schema({
    messageId: { type: String, required: true },
    clientId: { type: String, required: true },
    users: { type: Array },
}, { timestamps: true })

const NewMessage = mongoose.model('NewMessage', NewMessageSchema)
const MessagingList = mongoose.model('MessagingList', MessagingListSchema)

module.exports = { NewMessage, MessagingList }
