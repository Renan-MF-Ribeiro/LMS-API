const axios = require('axios');

const _messages = require('../../utils/messages');

module.exports = {
    async getUsersProviderConfig(req, res) {
        try {
            const url = `${process.env.API_INTEGRATOR}/connection/config/${process.env.CLIENT_ID}`;

            const headers = {
                'x-api-key': process.env.API_KEY_INTEGRATOR,
            };

            const response = await axios({
                method: 'get',
                url,
                headers,
            });

            return _messages.success(
                res,
                req,
                response.data,
                'Sucesso',
                'support',
                'createTicket'
            );
        } catch (error) {
            console.log(error)
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'support',
                'createTicket'
            );
        }
    },

    async updateUsersProviderConfig(req, res) {
        try {
            const url = `${process.env.API_INTEGRATOR}/connection/config/${process.env.CLIENT_ID}`;

            const headers = {
                'x-api-key': process.env.API_KEY_INTEGRATOR,
            };

            const response = await axios({
                method: 'put',
                url,
                headers,
                data: req.body,
            });
            
            return _messages.success(
                res,
                req,
                response.data,
                'Sucesso',
                'support',
                'createTicket'
            );
        } catch (error) {
            console.log(error)
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'support',
                'createTicket'
            );
        }
    },
};
