const mongoose = require('mongoose');
const { connect } = require('../../../utils/db');

connect();

const MessageAutomationSchema = new mongoose.Schema(
    {
        isActive: { type: Boolean, required: true, default: false },
        type: { type: String, required: true }, // byClass | byTrail
        name: { type: String, required: true }, // trail.title ou classgroup.groupCode
        targetId: { type: String, required: true }, // _id da Trail ou ClassGroup
        automations: { type: Array, required: true },
    },
    { timestamps: true }
);

const MessageAutomation = mongoose.model(
    'message_automation',
    MessageAutomationSchema
);

module.exports = { MessageAutomation };
