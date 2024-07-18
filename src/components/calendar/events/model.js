const mongoose = require('mongoose')
const { connect } = require('../../../utils/db')

connect()

const EVENT_TYPE = Object.freeze({
  CONCLUSION: 'conclusion',
  COURSE: 'course',
  REVOKED: 'revoked',
});

const optionsSchema = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}

const eventSchema = new mongoose.Schema({
    title: { type: String },
    userId: { type: 'ObjectId', ref: 'users', required: true },
    trailId: { type: 'ObjectId', ref: 'trails', required: false },
    classId: { type: 'ObjectId', ref: 'courses', required: false },
    type: { type: String, required: true, enum: Object.values(EVENT_TYPE) },
}, {
    ...optionsSchema,
})

const EventModel = mongoose.model('calendar_events', eventSchema)

module.exports = {
  EVENT_TYPE,
  EventModel
};


