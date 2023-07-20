const { default: axios } = require('axios');
const { getUserByToken } = require('../../utils/functions');
const _messages = require('../../utils/messages');

module.exports = {
    async generate(req, res) {
        try {
            const user = await getUserByToken(req);
            const uri = `${process.env.API_CONNECT}/system-users`;
            const { data } = await axios.post(
                uri,
                {
                    userId: user._id,
                },
                {
                    headers: {
                        'system-user-key': process.env.CONNECT_CLIENT_KEY,
                    },
                    params: {
                        clientId: process.env.CLIENT_ID,
                    },
                }
            );

            _messages.success(
                res,
                req,
                data,
                'Credenciais geradas com sucesso',
                'system-users',
                'generate'
            );
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                null,
                'system-users',
                'generate'
            );
        }
    },

    async getActive(req, res) {
        try {
            const uri = `${process.env.API_CONNECT}/system-users/${process.env.CLIENT_ID}`;
            const { data } = await axios.get(uri, {
                headers: {
                    'system-user-key': process.env.CONNECT_CLIENT_KEY,
                },
            });
            _messages.success(
                res,
                req,
                data,
                'Key solicitada com sucesso',
                'system-users',
                'getActive'
            );
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                null,
                'system-users',
                'getActive'
            );
        }
    },
};
