const { default: axios } = require("axios");

const certificateClient = axios.create({
    baseURL: process.env.API_CERTIFICATES,
});

module.exports = { certificateClient };
