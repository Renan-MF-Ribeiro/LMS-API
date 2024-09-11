const mongoose = require('mongoose');
const { connect } = require('../../utils/db');

connect();

const optionsSchema = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
};

const PartnerSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },
        logo: { type: String },
        keys: {
            type: [
                {
                    key: { type: String },
                    title: { type: String, required: true },
                    inititalDate: { type: Date },
                    endDate: { type: Date },
                    defaultField: [{ key: { type: String }, value: { type: String } }],
                    elegibilityResult: [{ key: { type: String }, value: { type: String } }],
                    classGroupResult: [{ key: { type: String }, value: { type: String } }],
                },
            ],
            required: true,
            default: [],
        },
        active: { type: Boolean, default: true },
    },
    {
        ...optionsSchema,
    }
);

PartnerSchema.index({
    name: 'text',
});

const Partner = mongoose.model('partners', PartnerSchema);

module.exports = {
    Partner,
};
