const mongoose = require('mongoose');

const IdpIntegrationProfileSchema = new mongoose.Schema({
    name: { type: String, required: true },
    profiles: { type: [String], required: false, default: [] }
}, { timestamps: true });

const IdpIntegrationSchema = new mongoose.Schema({
    identityProvider: { type: String, required: true },
    active: { type: Boolean, required: false, default: true },
    keyField: { type: String, required: true },
    profiles: { type: [IdpIntegrationProfileSchema], required: false, default: [] }
}, { timestamps: true });

const IdpIntegrationModel = mongoose.model('idp_integration', IdpIntegrationSchema);

module.exports = {
    IdpIntegrationModel
}