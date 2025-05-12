const { default: axios } = require('axios');

const mentoringApi = axios.create({ baseURL: process.env.API_MENTORING });

const mentoringApiMiddleware = (req, res, next) => {
    const token = req.headers.authorization;

    if (token) {
        const isBearer = token?.startsWith('Bearer');
        mentoringApi.defaults.headers.common.authorization = isBearer ? token : `Bearer ${token}`;
    }

    next();
};

module.exports = {
    mentoringApi,
    mentoringApiMiddleware,
};
