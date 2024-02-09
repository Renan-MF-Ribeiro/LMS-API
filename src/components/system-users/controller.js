const { default: axios } = require('axios');
const { getUserByToken } = require('../../utils/functions');
const _messages = require('../../utils/messages');

module.exports = {
    async generate(req, res) {
        try {
            const user = await getUserByToken(req);
            const uri = `${process.env.API_CONNECT}/system-users/${process.env.CLIENT_ID}`;
            let data;
            try {
                const { data: responseData } = await axios.post(
                    uri,
                    {
                        userId: user._id,
                    },
                    {
                        headers: {
                            'connect-client-key':
                                process.env.CONNECT_CLIENT_KEY,
                        },
                    }
                );
                data = responseData;
            } catch (err) {
                console.error(err);
                // TODO improve error handling
                throw err;
            }

            _messages.success(
                res,
                req,
                data,
                'Credenciais geradas com sucesso',
                'system-users',
                'generate'
            );
        } catch (error) {
            console.log(error);
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

            let data;
            try {
                const { data: responseData } = await axios.get(uri, {
                    headers: {
                        'connect-client-key': process.env.CONNECT_CLIENT_KEY,
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
                'Key solicitada com sucesso',
                'system-users',
                'getActive'
            );
        } catch (error) {
            console.log(error);
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
