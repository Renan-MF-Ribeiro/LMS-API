const _messages = require('../../../utils/messages');
const { socialApi } = require('../../social/http-adapter');

module.exports = {
    async createOrUpdateConfig(req, res) {
        const configBody = req.body;
        try {
            const uri = `config`;
            const { data } = await socialApi.post(uri, configBody);
            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'createOrUpdateConfig'
            );
        }
    },
    async getClientFeedConfig(req, res) {
        try {
            const uri = `config/${process.env.CLIENT_ID}`;
            const { data } = await socialApi.get(uri);
            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'getClientFeedConfig'
            );
        }
    },
};
