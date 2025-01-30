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
    Messenger: 'messenger',
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

// Segmentação
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

// Messenger
const MessengerConfigModel = ConfigModel.discriminator(
    ConfigTypes.Messenger,
    new mongoose.Schema({
        sendUsersToMicrosservice: { type: Boolean, default: false },
        sendWelcomeCampaign: { type: Boolean, default: false },
        emailTemplate: {
            primary: { type: String, required: true, trim: true, default: '#38B9C2' },
            secondary: { type: String, required: true, trim: true, default: '#ffffff' },
            logo: { type: String, required: true, trim: true, default: 'https://happlearning.blob.core.windows.net/logo/logoHapp.png' },
            buttonTextColor: { type: String, required: true, trim: true, default: '#FFFFFF' },
            buttonBackgroundColor: { type: String, required: true, trim: true, default: '#38B9C2' },
            client: { type: String, required: true, trim: true, default: 'LMS Happlearning' },
            thumbnail: { type: String, required: true, trim: true, default: 'https://happlearning.blob.core.windows.net/logo/thumbnailHapp.png' },
            footer: { type: String, required: true, trim: true, default: 'https://happlearning.blob.core.windows.net/logo/footerHapp.png' },
        },
    }, schemaOptions)
)

module.exports = {
    ConfigModel,
    ConfigTypes,
    SegmentationConfigModel,
    MessengerConfigModel,
};
