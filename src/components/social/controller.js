const { default: axios } = require('axios');
const { getUserByToken } = require('../../utils/functions');
const _messages = require('../../utils/messages');

module.exports = {
    async getConfig(req, res) {
        try {
            const user = await getUserByToken(req);
            const uri = `${process.env.API_SOCIAL}/client-config/${process.env.CLIENT_ID}`;
            const { data } = await axios.get(uri);

            _messages.success(
                res,
                req,
                data,
                'configurações encontradas',
                'social',
                'getConfig'
            );
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                null,
                'social',
                'getConfig'
            );
        }
    },

    async postConfig(req, res) {
        try {
            const uri = `${process.env.API_SOCIAL}/client-config/${process.env.CLIENT_ID}`;

            let data;
            try {
                const { data: responseData } = await axios.get(uri, {
                    headers: {
                        'system-user-key': process.env.CONNECT_CLIENT_KEY,
                    },
                });
                data = responseData;
            } catch (err) {
                if (err.response.data.statusCode === 404) {
                    _messages.notFound(
                        res,
                        req,
                        JSON.stringify(err.response.data),
                        'nenhuma key ativa encontrada para o cliente',
                        'system-users',
                        'getActive'
                    );
                    return;
                } else {
                    throw err;
                }
            }

            _messages.success(
                res,
                req,
                data,
                'configurações atualizadas',
                'social',
                'putConfig'
            );
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                null,
                'social',
                'putConfig'
            );
        }
    },
};
