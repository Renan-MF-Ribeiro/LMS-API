const mongoose = require('mongoose');
const { connect } = require('../../utils/db');

connect();

const schemaOptions = {
    strict: false,
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
};

const ConfigTypes = {
    SocialFields: 'social-fields',
    AutomaticEligibility: {
        Onboard: 'automatic-eligibility-onboard',
    },
    Segmentation: 'segmentation',
};
const ConfigSchema = new mongoose.Schema(
    {
        type: { type: ConfigTypes, required: true, trim: true },
        value: { type: Object, required: true },
    },
    {
        ...schemaOptions,
        discriminatorKey: 'type',
    }
);

ConfigSchema.index({ type: 1 }, { unique: true });

const ConfigModel = mongoose.model('configs', ConfigSchema);

const SegmentationRuleSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    issuer: { type: String, required: true, trim: true },
});

const SegmentationExceptionSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    issuer: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
});

const SegmentationStandardSchema = new mongoose.Schema(
    {
        rule: { type: SegmentationRuleSchema },
        exceptions: { type: [SegmentationExceptionSchema], default: [] },
    },
    {
        _id: false,
    }
);

const SegmentationConfigSchema = new mongoose.Schema(
    {
        value: { type: SegmentationStandardSchema, default: {} },
    },
    { ...schemaOptions }
);

const SegmentationConfigModel = ConfigModel.discriminator(
    ConfigTypes.Segmentation,
    SegmentationConfigSchema
);

module.exports = {
    ConfigModel,
    ConfigTypes,
    SegmentationConfigModel,
};
