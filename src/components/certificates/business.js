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

    if(req.files.file) form.append("file", fs.createReadStream(req.files.file.path));

    return form;
}

const updateCertificateExpirationDate = async (req) => {
    if (req.fields.payload) {
        try {
            payload = JSON.parse(req.fields.payload)
        } catch { }
    }

    try {
        await certificateClient.patch(
            `/certificates/update-expiration-date/${process.env.CLIENT_ID}`,
            {
                trailId: payload._id,
                expirationType: payload.expirationType,
            },
            {
                headers: getHeaders(req),
            }
        );
    } catch (error) {
        console.log({ error });
    }
};

module.exports = { 
    certificateClient,
    getHeaders,
    prepareFormData,
    updateCertificateExpirationDate
};
