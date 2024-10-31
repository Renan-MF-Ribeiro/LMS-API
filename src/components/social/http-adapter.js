const { default: axios } = require('axios');

const socialApi = axios.create({ baseURL: process.env.API_SOCIAL });

const socialApiMiddleware = (req, res, next) => {
    const token = req.headers.authorization;

    if (token && !token?.startsWith('Bearer')) {
        socialApi.defaults.headers.common.authorization = `Bearer ${token}`;
    }

    next();
};

module.exports = {
    socialApi,
    socialApiMiddleware,
};
