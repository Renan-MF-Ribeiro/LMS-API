const mongoose = require('mongoose')
const { connect } = require('../../utils/db')

connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}

const ProfileSchema = new mongoose.Schema({
    title: { type: String, trim: true, required: true, lowercase: true },
}, {
    ...schemaOptions,
})

ProfileSchema.index({
    title: 'text',
})

const Profile = mongoose.model('profiles', ProfileSchema)

module.exports = {
    Profile,
}
