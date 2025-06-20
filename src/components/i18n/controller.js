const { i18nBusiness } = require('./business');
const _messages = require('../../utils/messages');

const i18nController = {
    get: async (req, res) => {
        try {
            const { locale } = req.params;
            const { context } = req.query;

            const data = await i18nBusiness.get(locale, context);

            return _messages.success(res, req, data, 'ok', 'i18n', 'get');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';

            res.status(statusCode).json(errorMessage);
        }
    },

    create: async (req, res) => {
        try {
            const data = await i18nBusiness.create(req.body);

            return _messages.success(res, req, data, 'ok', 'i18n', 'create');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';

            res.status(statusCode).json(errorMessage);
        }
    },
};

module.exports = i18nController;
