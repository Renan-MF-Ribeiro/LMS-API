const mongoose = require('mongoose')
const { connect } = require('../../../utils/db')
connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}


const featuresSchema = new mongoose.Schema({
    registerUser: { type: Boolean, required: true, default: false },
    notificationComponent: { type: Boolean, default: true },
    welcomeComponent: { type: Boolean, required: true, default: false },
    policyPrivacy: { type: Boolean, default: true },
    feedbackPlataformComponent: { type: Boolean, required: true, default: false },
    helpComponent: { type: Boolean, required: true, default: false },
    showcaseComponent: { type: Boolean, required: true, default: false },
    gamefication: { type: Boolean, required: true, default: false },
    shop: { type: Boolean, required: true, default: false },
    gameficationCoins: { type: Boolean, required: false, default: false },
    collaborationComponent: { type: Boolean, required: true, default: false },
    library: { type: Boolean, default: true },
    activityItem: { type: Boolean, default: true },
    apiKey: { type: Boolean, required: true, default: false },
    certificateTrail: { type: Boolean, default: true },
    expirationCertificate: { type: Boolean, default: true },
    sendInBlue: { type: Boolean, default: true },
    changePasswordByEmail: { type: Boolean, required: true, default: false },
    certificateShare: { type: Boolean, required: true, default: false },
    happplace: { type: Boolean, required: true, default: false },
    atividadePresencial: { type: Boolean, default: true },
    supportStudent: { type: Boolean, required: true, default: false },
    supportAdmin: { type: Boolean, required: true, default: true },
    mfa: { type: Boolean, required: true, default: false },
    padlet: { type: Boolean, default: true },
    social: { type: Boolean, required: true, default: false },
    singleUser: { type: Boolean, required: true, default: false },
    userPayloadMapping: { type: Boolean, default: true },
    enableVideoSeek: { type: Boolean, required: true, default: false },
    imageEditor: { type: Boolean, default: true },
    assessement: { type: Boolean, required: true, default: false },
    calendar: { type: Boolean, required: true, default: false },
    onboarding: { type: Boolean, required: true, default: false },
    partners: { type: Boolean, required: true, default: false },
    alura: { type: Boolean, required: true, default: false },
    feed: { type: Boolean, required: true, default: false },
    segmentation: { type: Boolean, required: true, default: false },
    webhook: { type: Boolean, required: true, default: false },
    mentoring: { type: Boolean, required: true, default: false },
    matrix: { type: Boolean, required: true, default: false },
}, {
    ...schemaOptions,
})

const Features = mongoose.model('features', featuresSchema)

module.exports = {
    Features,
}
