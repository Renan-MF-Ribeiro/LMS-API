const { default: axios } = require('axios');

const processApi = axios.create({ 
    baseURL: process.env.API_PROCESS,
    headers: { 'X-origin': process.env.DOMAIN }
});

const processApiMiddleware = (req, res, next) => {
    const token = req.headers.authorization;

    if (token) {
        const isBearer = token?.startsWith('Bearer');
        processApi.defaults.headers.common.authorization = isBearer ? token : `Bearer ${token}`;
    }

    next();
};

module.exports = {
    processApi,
    processApiMiddleware,
};
