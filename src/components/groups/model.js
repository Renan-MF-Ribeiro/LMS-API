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
    owner: { type: 'ObjectId', ref: 'users' }
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
const ClassGroupSchema = new mongoose.Schema({
    groupCode: { type: String, required: true },
    startDate: { type: Date, required: false },
    limitDate: { type: Date, required: false },
    classId: { type: Number, required: true },
    status: { type: Number, required: true },
    owner: { type: 'ObjectId', ref: 'users' }
}, {
    ...optionsSchema,
})

GroupSchema.index({
    name: 'text',
})

const Group = mongoose.model('groups', GroupSchema)
const InstructorGroup = mongoose.model('instructor_groups', InstructorGroupSchema)
const ClassGroup = mongoose.model('class_groups', ClassGroupSchema)

module.exports = {
    Group,
    InstructorGroup,
    ClassGroup
    
}
