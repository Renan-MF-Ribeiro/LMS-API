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
                tagsLists: reqBody.tagsLists,
                usersLists: reqBody.usersLists,
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
            const {
                allowed: allowedIdsList,
                blocked: blockedIdsList,
                moderated: moderatedIdsList,
            } = response.data.usersLists;

            const allowed = await _business.getUsersByIdsList(
                allowedIdsList,
                options
            );
            const blocked = await _business.getUsersByIdsList(
                blockedIdsList,
                options
            );
            const moderated = await _business.getUsersByIdsList(
                moderatedIdsList,
                options
            );

            _messages.success(
                res,
                req,
                { allowed, blocked, moderated },
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

    async addOrRemoveFromUserList(req, res) {
        try {
            const { operation, list } = req.body;

            const validOperations = ['add', 'remove'];
            if (!validOperations.includes(operation)) {
                _messages.badRequest(
                    res,
                    req,
                    'Operação inválida',
                    'Operação inválida',
                    'social',
                    'addOrRemoveFromUserList'
                );
                return;
            }

            const validLists = ['allowed', 'blocked', 'moderated'];
            if (!validLists.includes(list)) {
                _messages.badRequest(
                    res,
                    req,
                    'Lista inválida',
                    'Lista inválida',
                    'social',
                    'addOrRemoveFromUserList'
                );
                return;
            }

            const collaborator = await _functions.getUserByToken(req);
            const { userId } = req.body;

            const body = {
                user: {
                    userId: userId,
                    collaboratorId: collaborator._id,
                    updatedAt: new Date(),
                },
                operation,
                listName,
            };
            const uri = `${process.env.API_SOCIAL}/client-config/users-lists/${process.env.CLIENT_ID}`;
            try {
                const response = await axios.patch(uri, body);
                return _messages.success(
                    res,
                    req,
                    response.data,
                    'ok',
                    'social',
                    'addOrRemoveFromUserList'
                );
            } catch (error) {
                if (error.response?.data.statusCode === 400) {
                    return _messages.badRequest(
                        res,
                        req,
                        JSON.stringify(err.response.data.message),
                        'bad request to social',
                        'social',
                        'addOrRemoveFromUserList'
                    );
                } else {
                    throw error;
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
                'addOrRemoveFromUserList'
            );
        }
    },
};
