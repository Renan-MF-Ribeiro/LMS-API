const { newsApi } = require('../http-adapter');
const _messages = require('../../../utils/messages');

const configController = {
    getConfig: async (req, res) => {
        try {
            const { data } = await newsApi.get('/config');

            return _messages.success(res, req, data, 'ok', 'news', 'getConfig');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;

            return _messages.internalServer(res, req, message, message, 'news', 'getForm');
        }
    },

    updateConfig: async (req, res) => {
        try {
            const { data } = await newsApi.put('/config', req.body);

            return _messages.success(res, req, data, 'ok', 'news', 'updateConfig');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;

            return _messages.internalServer(res, req, message, message, 'news', 'getForm');
        }
    },
};

module.exports = configController;
