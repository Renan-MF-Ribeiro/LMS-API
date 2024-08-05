const { default: axios } = require("axios");
const formData = require('form-data');
const fs = require('fs')

const certificateClient = axios.create({
    baseURL: process.env.API_CERTIFIER,
});

const getHeaders = (req) => ({
    Authorization: `Bearer ${req.headers.authorization}`
});

const prepareFormData = (req) => {
    const form = new formData();

    Object.keys(req.fields).forEach(key => {
        form.append(key, req.fields[key]);
    });

    form.append("file", fs.createReadStream(req.files.file.path));

    return form;
}

module.exports = { certificateClient, getHeaders, prepareFormData };
