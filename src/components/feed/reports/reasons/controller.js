const _messages = require('../../../utils/messages');
const { socialApi } = require('../../social/http-adapter');

module.exports = {
    listReasons: async (req, res) => {
        try {
            const uri = 'reports/reasons';
            const { data } = await socialApi.get(uri, { params: req?.query });

            return _messages.success(res, req, data, 'ok', 'feed', 'reports/reasons');
        } catch (error) {
            _messages.badRequest(res, req, error.message, error.message, 'feed', 'reports/reasons');
        }
    },

    createReason: async (req, res) => {
        try {
            const uri = 'reports/reasons';
            const { data } = await socialApi.post(uri, req.body);

            return _messages.success(res, req, data, 'ok', 'feed', 'reports/reasons');
        } catch (error) {
            _messages.badRequest(res, req, error.message, error.message, 'feed', 'reports/reasons');
        }
    },

    updateReason: async (req, res) => {
        try {
            const { reasonId } = req.params;
            const uri = `reports/reasons/${reasonId}`;
            const { data } = await socialApi.post(uri, req.body);

            return _messages.success(res, req, data, 'ok', 'feed', 'reports/reasons/:reasonId');
        } catch (error) {
            _messages.badRequest(
                res,
                req,
                error.message,
                error.message,
                'feed',
                'reports/reasons/:reasonId'
            );
        }
    },

    deleteReason: async (req, res) => {
        try {
            const { reasonId } = req.params;
            const uri = `reports/reasons/${reasonId}`;
            const { data } = await socialApi.delete(uri);

            return _messages.success(res, req, data, 'ok', 'feed', 'reports/reasons/:reasonId');
        } catch (error) {
            _messages.badRequest(
                res,
                req,
                error.message,
                error.message,
                'feed',
                'reports/reasons/:reasonId'
            );
        }
    },
};
