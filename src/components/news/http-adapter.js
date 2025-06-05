const { default: axios } = require('axios');

const newsApi = axios.create({
    baseURL: process.env.API_NEWS,
    headers: { 'X-origin': process.env.DOMAIN }
});

const newsApiMiddleware = (req, res, next) => {
    const token = req.headers.authorization;
    console.log('newsApiMiddleware', token);
    if (token) {
        const isBearer = token?.startsWith('Bearer');
        console.log('newsApiMiddleware', token, isBearer);
        newsApi.defaults.headers.common.authorization = isBearer ? token : `Bearer ${token}`;
    }

    next();
};

module.exports = {
    newsApi,
    newsApiMiddleware,
};
