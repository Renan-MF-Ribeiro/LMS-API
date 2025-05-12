const { default: axios } = require('axios');

const matricesApi = axios.create({ baseURL: process.env.API_MATRICES });

const matricesApiMiddleware = (req, res, next) => {
    const token = req.headers.authorization;

    if (token) {
        const isBearer = token?.startsWith('Bearer');
        matricesApi.defaults.headers.common.authorization = isBearer ? token : `Bearer ${token}`;
    }

    next();
};

module.exports = {
    matricesApi,
    matricesApiMiddleware,
};
