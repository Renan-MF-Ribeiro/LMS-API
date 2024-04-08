const mongoose = require('mongoose');
const { Schema } = mongoose;
// Define the schema for the primary and secondary fields recoverPassword
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
    enabled: { type: Number, default: 0 }
});

// Define the schema for the formLogin form
const formLoginSchema = new Schema({
    mask: String,
    registerUser: { type: Number, },
    recoverPasswordTwoLabels: { type: Number, },
    recoverPasswordEmptyMail: { type: Number, },
    primary: fieldSchema,
    secondary: fieldSchema,
    enabled: { type: Number, default: 1 }
});

// Define the main schema that includes all the forms
const configLogin = new Schema({
    ssoForm: { type: ssoFormSchema, required: false },
    formLogin: { type: formLoginSchema, required: false },
    singleUser: { type: Number, default: 0 }
});


// Create the Mongoose model
const ConfigLogin = mongoose.model('login_config', configLogin);

module.exports = {
    ConfigLogin,
}

