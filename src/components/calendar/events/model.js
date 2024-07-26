const mongoose = require('mongoose')
const { connect } = require('../../../utils/db')

connect()

const EVENT_TYPE = Object.freeze({
  CONCLUSION: 'conclusion',
  COURSE: 'course',
  REVOKED: 'revoked',
  CERTIFICATE: 'certificate',
});

const TARGET_ID = Object.freeze({
  TRAIL: 'trail',
  COURSE: 'course',
  CERTIFICATE: 'certificate',
  COLLABORATION: 'collaboration',
});

const optionsSchema = {
  strict: 'throw',
  timestamps: true,
  collation: { locale: 'en_US', strength: 1 },
}

const eventSchema = new mongoose.Schema({
  title: { type: String },
  userId: { type: 'ObjectId', ref: 'users', required: true },
  target: {
    type: {
      id: { type: Boolean, required: false, trim: true, default: false },
      type: { type: String, required: true, enum: Object.values(TARGET_ID) },
    }
  },
  eventStartDate: { type: Date, default: new Date() },
  eventEndDate: { type: Date, default: new Date() },
  type: { type: String, required: true, enum: Object.values(EVENT_TYPE) },
}, {
  ...optionsSchema,
})

const EventModel = mongoose.model('calendar_events', eventSchema)

module.exports = {
  EVENT_TYPE,
  TARGET_ID,
  EventModel
};


