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
    notificationComponent: { type: Boolean, required: true, default: true },
    welcomeComponent: { type: Boolean, required: true, default: false },
    policyPrivacy: { type: Boolean, required: true, default: false },
    feedbackPlataformComponent: { type: Boolean, required: true, default: false },
    helpComponent: { type: Boolean, required: true, default: false },
    showcaseComponent: { type: Boolean, required: true, default: false },
    gamefication: { type: Boolean, required: true, default: false },
    gameficationCoins: { type: Boolean, required: true, default: false },
    collaborationComponent: { type: Boolean, required: true, default: false },
    library: { type: Boolean, required: true, default: false },
    activityItem: { type: Boolean, required: true, default: false },
    apiKey: { type: Boolean, required: true, default: false },
    certificateTrail: { type: Boolean, required: true, default: false },
    expirationCertificate: { type: Boolean, required: true, default: false },
    sendInBlue: { type: Boolean, required: true, default: false },
    changePasswordByEmail: { type: Boolean, required: true, default: false },
    certificateShare: { type: Boolean, required: true, default: false },
    happplace: { type: Boolean, required: true, default: false },
    atividadePresencial: { type: Boolean, required: true, default: false },
    supportStudent: { type: Boolean, required: true, default: false },
    supportAdmin: { type: Boolean, required: true, default: true },
    mfa: { type: Boolean, required: true, default: false },
    padlet: { type: Boolean, required: true, default: false },
    social: { type: Boolean, required: true, default: false },
    singleUser: { type: Boolean, required: true, default: false },
    userPayloadMapping: { type: Boolean, required: true, default: false },
    enableVideoSeek: { type: Boolean, required: true, default: false },
    imageEditor: { type: Boolean, required: true, default: false },
    assessement: { type: Boolean, required: true, default: false },
    calendar: { type: Boolean, required: true, default: false },
    onboarding: { type: Boolean, required: true, default: false },
    partners: { type: Boolean, required: true, default: false },
    alura: { type: Boolean, required: true, default: false },
}, {
    ...schemaOptions,
})

const Features = mongoose.model('features', featuresSchema)

module.exports = {
    Features,
}
