const { i18nBusiness } = require('./business');
const { i18nApi } = require('./http-adapter');

const i18nController = {
    get: async (req, res) => {
        try {
            const { locale } = req.params;
            const { context } = req.query;

            const data = await i18nBusiness.get(locale, context);

            res.status(data.statusCode).json(data.data);
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

            res.status(data.statusCode).json(data.data);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';

            res.status(statusCode).json(errorMessage);
        }
    },
};

module.exports = i18nController;
