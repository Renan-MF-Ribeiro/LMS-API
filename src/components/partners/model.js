const mongoose = require('mongoose');
const { connect } = require('../../utils/db');

connect();

const optionsSchema = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
};

const PartnerSchema = new mongoose.Schema(
    //TODO- verificar obrigatoriedade de key/string 
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },
        logo: { type: String },
        keys: {
            type: [
                {
                    key: { type: String, required: true },
                    title: { type: String, required: true },
                    dataInicio: { type: Date, required: true },
                    dataFim: { type: Date, required: true },
                    defaultField: [{ key: String, value: string }],
                    elegibilityResult: [{ key: String, value: string }],
                    classGroupResult: [{ key: String, value: string }],
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
