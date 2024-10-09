const axios = require('axios');
const _messages = require('../../../utils/messages');

module.exports = {
    async createOrUpdateConfig(req, res) {
        const configBody = req.body;
        try {
            const uri = `${process.env.API_SOCIAL}/config`;
            const { data } = await axios.post(uri, configBody);
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
            const uri = `${process.env.API_SOCIAL}/config/${process.env.CLIENT_ID}`;
            const { data } = await axios.get(uri);
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
