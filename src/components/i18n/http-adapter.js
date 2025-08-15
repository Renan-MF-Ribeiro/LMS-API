const { default: axios } = require('axios');

const i18nApi = axios.create({ baseURL: process.env.API_I18N });

const i18nApiMiddleware = (req, res, next) => {
    const token = req.headers.authorization;

    if (token) {
        const isBearer = token?.startsWith('Bearer');
        i18nApi.defaults.headers.common.authorization = isBearer ? token : `Bearer ${token}`;
    }

    next();
};

module.exports = {
    i18nApi,
    i18nApiMiddleware,
};
