const mongoose = require('mongoose')
const { connect } = require('../../utils/db')

connect()

const optionsSchema = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}

const GroupSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    tags: { type: Array, default: [] },
    deleted: { type: Number, default: 0 },
    active: { type: Number, default: 1 },
}, {
    ...optionsSchema,
})

const InstructorGroupSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    office: { type: String, required: true },
    tags: { type: Array, required: true },
    trails: [{ type: 'ObjectId', ref: 'trails', required: true }],
}, {
    ...optionsSchema,
})

GroupSchema.index({
    name: 'text',
})

const Group = mongoose.model('groups', GroupSchema)
const InstructorGroup = mongoose.model('instructor_groups', InstructorGroupSchema)

module.exports = {
    Group,
    InstructorGroup,
}
