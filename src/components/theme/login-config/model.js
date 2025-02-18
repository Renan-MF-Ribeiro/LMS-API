const mongoose = require('mongoose');
const { Schema } = mongoose;
// Define the schema for the primary and secondary fields recoverPassword
const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}

const fieldSchema = new Schema({
    mask: String,
    field: String,
    label: String,
});

// Define the schema for the SSO form
const ssoFormSchema = new Schema({
    entrypoint: { type: String, },
    issuer: { type: String, },
    callback_url: { type: String, },
    certifier: { type: String, },
    claim: { type: String, },
    claimKey: { type: String, },
    enabled: { type: Number, default: 0 },
    forceAuth: { type: Boolean, default: false },
    buttonLabel: { type: String, default: 'Entrar com SSO', required: false },
    buttonBackground: { type: String, default: null, required: false },
    buttonTextColor: { type: String, default: null, required: false },
    strategyName: { type: String, default: 'saml', required: false },
});

ssoFormSchema.index({ strategyName: 1 }, { unique: true });

// Define the schema for the OpenID form
const openidFormSchema = new Schema({
    issuer: { type: String, required: true },
    entrypoint: { type: String, required: true },
    client_id: { type: String, required: true },
    client_secret: { type: String, required: true },
    callback_url: { type: String, required: true },
    claim: { type: String, required: true },
    claimKey: { type: String, required: true },
    enabled: { type: Boolean, default: true, required: true },
    strategyName: { type: String, default: 'openidconnect', required: false },
    authorization_url: { type: String, required: true },
    token_url: { type: String, required: true },
    user_info_url: { type: String, required: true },
    buttonLabel: { type: String, required: false },
    buttonBackground: { type: String, default: null, required: false },
    buttonTextColor: { type: String, default: null, required: false },
});

// Define the schema for the formLogin form
const formLoginSchema = new Schema({
    mask: String,
    registerUser: { type: Number, },
    recoverPasswordTwoLabels: { type: Number, },
    recoverPasswordEmptyMail: { type: Number, },
    primary: fieldSchema,
    secondary: fieldSchema,
    enabled: { type: Number, default: 1 },
    idle: { type: Boolean, default: false },
    idleTime: { type: Number, default: 60 },
});

// Define the main schema that includes all the forms
const configLogin = new Schema({
    ssoForm: { type: [ssoFormSchema], required: false },
    openidForm: { type: [openidFormSchema], required: false },
    formLogin: { type: formLoginSchema, required: false },
    singleUser: { type: Number, default: 0 }
}, {
    ...schemaOptions,
});


// Create the Mongoose model
const ConfigLogin = mongoose.model('login_config', configLogin);

module.exports = {
    ConfigLogin,
}

