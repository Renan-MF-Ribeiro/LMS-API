const mongoose = require('mongoose');
const { connect } = require('../../utils/db');
const { FormModel } = require('../forms/model');

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
                    updatable: { type: Boolean, default: false },
                    initialDate: { type: Date },
                    endDate: { type: Date },
                    form: { type: mongoose.Schema.Types.ObjectId, ref: FormModel, required: false, default: null },
                    defaultField: [
                        {
                            key: { type: String },
                            value: { type: String }
                        }
                    ],
                    elegibilityResult: [
                        {
                            display: { type: String },
                            value: { type: String }
                        }
                    ],
                    overwriteEligibility: { type: Boolean, default: false },
                    classGroupResult: {
                        classGroups: [
                            {
                                type: mongoose.Schema.Types.ObjectId,
                                ref: 'class_groups',
                                required: true
                            }
                        ],
                        days: { type: Number },
                        overwriteClassGroup: { type: Boolean, default: false },
                    }
                }
            ],
            required: true,
            default: [],
        },
        active: { type: Boolean, default: true },
        owner: { type: String }
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
