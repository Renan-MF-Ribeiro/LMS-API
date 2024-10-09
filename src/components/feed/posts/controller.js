const axios = require('axios');
const _messages = require('../../../utils/messages');

module.exports = {
    async get(req, res) {
        try {
            const uri = `${process.env.API_SOCIAL}/posts`;
            const response = await axios.get(uri);
            return _messages.success(res, req, response);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'get'
            );
        }
    }
};
