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
    entrypoint: { type: String, required: true },
    issuer: { type: String, required: true },
    callback_url: { type: String, required: true },
    certifier: { type: String, required: true },
});

// Define the schema for the formLogin form
const formLoginSchema = new Schema({
    mask: String,
    registerUser: { type: Number, required: true },
    recoverPasswordTwoLabels: { type: Number, required: true },
    recoverPasswordEmptyMail: { type: Number, required: true },
    primary: fieldSchema,
    secondary: fieldSchema,
});

// Define the main schema that includes all the forms
const configLogin = new Schema({
    config: { type: String, required: true },
    ssoForm: ssoFormSchema,
    formLogin: formLoginSchema,
});

// Create the Mongoose model
const ConfigLogin = mongoose.model('config_login', configLogin);

module.exports = {
    ConfigLogin,
}

