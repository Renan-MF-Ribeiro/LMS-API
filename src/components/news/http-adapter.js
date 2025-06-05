const { default: axios } = require('axios');

const newsApi = axios.create({
    baseURL: process.env.API_NEWS,
    headers: { 'X-origin': process.env.DOMAIN }
});

const newsApiMiddleware = (req, res, next) => {
    const token = req.headers.authorization;

    if (token) {
        const isBearer = token?.startsWith('Bearer');
        newsApi.defaults.headers.common.authorization = isBearer ? token : `Bearer ${token}`;
    }

    next();
};

module.exports = {
    newsApi,
    newsApiMiddleware,
};
