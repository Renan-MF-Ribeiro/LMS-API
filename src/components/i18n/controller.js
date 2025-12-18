const { i18nBusiness } = require('./business');
const { getUserByToken } = require('../../utils/functions');
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

    createDictionary: async (req, res) => {
        try {
            const data = await i18nBusiness.createDictionary(req.body);
            return _messages.success(res, req, data, 'ok', 'i18n', 'createDictionary');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    getDefaultDictionary: async (req, res) => {
        try {
            const preferredLanguage = req.params.preferredLanguage || undefined;
            const data = await i18nBusiness.getDefaultDictionary(preferredLanguage);

            return _messages.success(res, req, data, 'ok', 'i18n', 'get');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';

            res.status(statusCode).json(errorMessage);
        }
    },

    listDictionaries: async (req, res) => {
        try {
            const { page, limit } = req.query;
            const data = await i18nBusiness.listDictionaries({ page, limit });
            return _messages.success(res, req, data, 'ok', 'i18n', 'listDictionaries');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    listActiveDictionaries: async (req, res) => {
        try {
            const data = await i18nBusiness.listActiveDictionaries();
            return _messages.success(res, req, data, 'ok', 'i18n', 'listActiveDictionaries');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    updateDictionary: async (req, res) => {
        try {
            const { id } = req.params;
            const data = await i18nBusiness.updateDictionary(id, req.body);
            return _messages.success(res, req, data, 'ok', 'i18n', 'updateDictionary');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    deleteDictionary: async (req, res) => {
        try {
            const { id } = req.params;
            const data = await i18nBusiness.deleteDictionary(id);
            return _messages.success(res, req, data, 'ok', 'i18n', 'deleteDictionary');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    getLocaleById: async (req, res) => {
        try {
            const { id } = req.params;
            const data = await i18nBusiness.getLocaleById(id);
            return _messages.success(res, req, data, 'ok', 'i18n', 'getLocaleById');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';

            res.status(statusCode).json(errorMessage);
        }
    },

    updateByKey: async (req, res) => {
        try {
            const { id } = req.params;
            const data = await i18nBusiness.updateByKey(id, req.body);

            return _messages.success(res, req, data, 'ok', 'i18n', 'updateByKey');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';

            res.status(statusCode).json(errorMessage);
        }
    },

    getLocaleByDictionaryId: async (req, res) => {
        try {
            const { id } = req.params;
            const { context } = req.query;
            const data = await i18nBusiness.getLocaleByDictionaryId(id, context);
            return _messages.success(res, req, data, 'ok', 'i18n', 'getLocaleByDictionaryId');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

};

module.exports = i18nController;