const mongoose = require('mongoose');
const { connect } = require('../../utils/db');

connect();

const ConfigTypes = {
    SocialFields: 'social-fields',
    AutomaticEligibility: {
        Onboard: 'automatic-eligibility-onboard',
    }
}

const ConfigSchema = new mongoose.Schema(
    {
        type: { type: ConfigTypes, required: true, trim: true },
        value: { type: Object, required: true },
    },
    {
        strict: false,
        timestamps: true,
    }
);

ConfigSchema.index({ type: 1 }, { unique: true });

const ConfigModel = mongoose.model('configs', ConfigSchema);

module.exports = {
    ConfigModel,
    ConfigTypes,
};
