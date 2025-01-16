const mongoose = require('mongoose');

const IdpIntegrationProfileSchema = new mongoose.Schema({
    name: { type: String, required: true },
    profiles: { type: [String], required: false, default: [] }
}, { timestamps: true });

const IdpIntegrationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    strategyName: { type: String, required: false, default: null },
    active: { type: Boolean, required: false, default: true },
    keyField: { type: String, required: true },
    valueSeparator: { type: String, required: false, default: ',' },
    profiles: { type: [IdpIntegrationProfileSchema], required: false, default: [] }
}, { timestamps: true });

const IdpIntegrationModel = mongoose.model('idp_integration', IdpIntegrationSchema);

module.exports = {
    IdpIntegrationModel
}