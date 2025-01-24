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

