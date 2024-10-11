const { default: axios } = require('axios');

const socialApi = axios.create({ baseURL: process.env.API_SOCIAL });

const socialApiMiddleware = (req, res, next) => {
    const token = req.headers.authorization;

    if (token) {
        socialApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    next();
};

module.exports = {
    socialApi,
    socialApiMiddleware,
};
