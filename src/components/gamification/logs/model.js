const mongoose = require('mongoose');
const { connect } = require('../../../utils/db');

connect();

const GAMIFICATION_LOG_TYPE = Object.freeze({
    EVENT: 'event',
});

const GAMIFICATION_LOG_STATUS = Object.freeze({
    PENDING: 'pending',
    PROCESSING: 'processing',
    SUCCESS: 'success',
    SYSTEM_ERROR: 'system_error',
    RETRY: 'retry',
    FAILED: 'failed',
});

function ifError() {
    return this.status === GAMIFICATION_LOG_STATUS.SYSTEM_ERROR
}

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
};

const GamificationLogSchema = new mongoose.Schema(
    {
        type: { type: String, required: true, enum: Object.values(GAMIFICATION_LOG_TYPE) },
    },
    {
        ...schemaOptions,
        discriminatorKey: 'type',
    }
);

const GamificationEventLogSchema = new mongoose.Schema(
    {
        status: {
            type: String,
            required: true,
            enum: Object.values(GAMIFICATION_LOG_STATUS),
            default: GAMIFICATION_LOG_STATUS.PENDING,
        },
        data: { type: Object, required: true },
        trace: { type: [Object], required: true },
        error: { type: Object, required: ifError }
    },
    schemaOptions
);

const GamificationLog = mongoose.model('gamification_logs', GamificationLogSchema);
const GamificationEventLog = GamificationLog.discriminator(GAMIFICATION_LOG_TYPE.EVENT, GamificationEventLogSchema);

module.exports = {
    GAMIFICATION_LOG_TYPE,
    GAMIFICATION_LOG_STATUS,
    GamificationLog,
    GamificationEventLog
};
