const mongoose = require('mongoose');
const { connect } = require('../../../utils/db');

connect();

const optionsSchema = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
};

const AvatarSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        image: { type: String, required: false },
        active: { type: Boolean, default: true },
        owner: { type: String, required: false }
    },
    {
        ...optionsSchema,
    }
);

AvatarSchema.index({
    name: 'text',
});

const Avatar = mongoose.model('avatars', AvatarSchema);

module.exports = {
    Avatar,
};
