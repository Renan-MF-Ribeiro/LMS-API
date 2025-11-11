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

    update: async (req, res) => {
        try {
            const { id } = req.params;
            const data = await i18nBusiness.update(id, req.body);

            return _messages.success(res, req, data, 'ok', 'i18n', 'update');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';

            res.status(statusCode).json(errorMessage);
        }
    },

    //FASE 2

    getDefaultLocale: async (req, res) => {
        try {
            const { code } = req.params;
            const data = await i18nBusiness.getDefaultLocale(code);

            return _messages.success(res, req, data, 'ok', 'i18n', 'getDefaultLocale');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';

            res.status(statusCode).json(errorMessage);
        }
    },

    listAll: async (req, res) => {
        try {
            const data = await i18nBusiness.listAllLocalesByClientId();
            return _messages.success(res, req, data, 'ok', 'i18n', 'listAll');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';

            res.status(statusCode).json(errorMessage);
        }
    },

    listActive: async (req, res) => {
        try {
            const data = await i18nBusiness.listActiveLocalesByClientId();
            return _messages.success(res, req, data, 'ok', 'i18n', 'listActive');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';

            res.status(statusCode).json(errorMessage);
        }
    },

    updateByKey: async (req, res) => {
        try {
            const { id, clientId } = req.params;
            const data = await i18nBusiness.updateByKey(id, clientId, req.body);

            return _messages.success(res, req, data, 'ok', 'i18n', 'updateByKey');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';

            res.status(statusCode).json(errorMessage);
        }
    }
};

module.exports = i18nController;