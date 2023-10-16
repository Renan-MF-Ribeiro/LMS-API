const { default: axios } = require('axios');
const _business = require('./business');
const _functions = require('../../utils/functions');
const _messages = require('../../utils/messages');

module.exports = {
    async getConfig(req, res) {
        try {
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

    async putConfig(req, res) {
        try {
            const reqBody = req.body;
            const uri = `${process.env.API_SOCIAL}/client-config/${process.env.CLIENT_ID}`;
            const body = {
                commentModeration: reqBody.commentModeration,
                blockedTrails: reqBody.blockedTrails,
                tags: reqBody.tags,
                users: reqBody.users,
            };

            try {
                const { data } = await axios.put(uri, body);
                return _messages.success(
                    res,
                    req,
                    data,
                    'configurações atualizadas',
                    'social',
                    'putConfig'
                );
            } catch (err) {
                console.log(err.response.data);
                if (err.response.data.statusCode === 404) {
                    return _messages.notFound(
                        res,
                        req,
                        JSON.stringify(err.response.data.message),
                        'configuração não encontrada',
                        'social',
                        'putConfig'
                    );
                } else if (err.response.data.statusCode === 400) {
                    return _messages.badRequest(
                        res,
                        req,
                        JSON.stringify(err.response.data.message),
                        'bad request to social',
                        'social',
                        'putConfig'
                    );
                } else {
                    throw err;
                }
            }
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

    async getUsers(req, res) {
        try {
            const { skip, limit } = _functions.pagination(req);
            const { order, sort } = _functions.ordernation(req);
            const searchBy = req.query.searchBy;
            const options = { skip, limit, order, sort, searchBy };

            const uri = `${process.env.API_SOCIAL}/client-config/${process.env.CLIENT_ID}`;
            const response = await axios.get(uri);
            const { allowed, blocked, moderated } = response.data.users;
            // console.log({ allowed, blocked, moderated });

            const { data: allowedData, total: allowedTotal } =
                await _business.getUsersByList(allowed, options);
            const { data: blockedData, total: blockedTotal } =
                await _business.getUsersByList(blocked, options);
            const { data: moderatedData, total: moderatedTotal } =
                await _business.getUsersByList(moderated, options);

            _messages.success(
                res,
                req,
                {
                    allowed: {
                        data: allowedData,
                        total: allowedTotal,
                    },
                    blocked: {
                        data: blockedData,
                        total: blockedTotal,
                    },
                    moderated: {
                        data: moderatedData,
                        total: moderatedTotal,
                    },
                },
                'configurações encontradas',
                'social',
                'getUsers'
            );
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                null,
                'social',
                'getUsers'
            );
        }
    },
};
