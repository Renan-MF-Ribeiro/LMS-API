const { default: axios } = require('axios');
const _business = require('./business');
const _functions = require('../../utils/functions');
const _messages = require('../../utils/messages');
const { Trail } = require('../trails/model');

module.exports = {
    async getConfig(req, res) {
        try {
            const uri = `${process.env.API_SOCIAL}/client-config/${process.env.CLIENT_ID}`;
            const { data } = await axios.get(uri);
            const trails = await Trail.find(
                { _id: { $in: data.blockedTrails } },
                'title'
            );

            const blockedTrailsWithName = data.blockedTrails.map((trailId) => ({
                _id: trailId,
                title: trails.find((trail) => trail._id.toString() === trailId)
                    .title,
            }));

            _messages.success(
                res,
                req,
                { ...data, blockedTrails: blockedTrailsWithName },
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
            const blockedTrailsOnlyId = reqBody.blockedTrails.map((trail) =>
                trail._id.toString()
            );

            const uri = `${process.env.API_SOCIAL}/client-config/${process.env.CLIENT_ID}`;
            const body = {
                commentModeration: reqBody.commentModeration,
                blockedTrails: blockedTrailsOnlyId,
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
            const { operation, listName } = req.body;

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
            if (!validLists.includes(listName)) {
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

    async createComment(req, res) {
        try {
            const uri = `${process.env.API_SOCIAL}/comment/${process.env.CLIENT_ID}`;
            const body = req.body
            const { data } = await axios.post(uri, body);

            return _messages.success(req, res, data)
        } catch (error) {
            console.log(error)
            return _messages.badRequest(error)
        }
    },
    async getAllComments(req, res) {
        try {
            const uri = `${API_SOCIAL}/comment/${process.env.CLIENT_ID}`;
            const { data } = await axios.get(uri);

            return _messages.success(req, res, data)
        } catch (error) {
            console.log(error)
            return _messages.badRequest(error)
        }
    },
    async getCommentsByTrailId(req, res) {
        try {
            const { trailId } = req.params
            const uri = `${API_SOCIAL}/comment/${trailId}`;
            const { data } = await axios.get(uri);

            return _messages.success(req, res, data)
        } catch (error) {
            console.log(error)
            return _messages.badRequest(error)
        }
    },
    async updateComment(req, res) {
        try {
            const { commentId } = req.params
            const body = req.body
            const uri = `${API_SOCIAL}/comment/${commentId}`;
            const { data } = await axios.put(uri, body);

            return _messages.success(req, res, data)
        } catch (error) {
            console.log(error)
            return _messages.badRequest(error)
        }
    },
    async createLike(req, res) {
        try {
            const uri = `${process.env.API_SOCIAL}/like/${process.env.CLIENT_ID}`;
            const body = req.body
            const { data } = await axios.post(uri, body);

            return _messages.success(req, res, data)
        } catch (error) {
            console.log(error)
            return _messages.badRequest(error)
        }
    },
    async getLikesByTrailId(req, res) {
        try {
            const { trailId } = req.params
            const uri = `${process.env.API_SOCIAL}/like/${trailId}`;
            const { data } = await axios.get(uri);

            return _messages.success(req, res, data)
        } catch (error) {
            console.log(error)
            return _messages.badRequest(error)
        }
    },
    async deleteLike(req, res) {
        try {
            const uri = `${process.env.API_SOCIAL}/like`;
            const body = req.body
            const { data } = await axios.delete(uri, body);

            return _messages.success(req, res, data)
        } catch (error) {
            console.log(error)
            return _messages.badRequest(error)
        }
    },
    async createFavorite(req, res) {
        try {
            const uri = `${process.env.API_SOCIAL}/favorite/${process.env.CLIENT_ID}`;
            const body = req.body
            const { data } = await axios.post(uri, body);

            return _messages.success(req, res, data)
        } catch (error) {
            console.log(error)
            return _messages.badRequest(error)
        }
    },
    async getFavoritesByUserId(req, res) {
        try {
            const { userId } = req.params
            const uri = `${process.env.API_SOCIAL}/favorite/${userId}`;
            const { data } = await axios.get(uri);

            return _messages.success(req, res, data)
        } catch (error) {
            console.log(error)
            return _messages.badRequest(error)
        }
    },
    async updateFavorite(req, res) {
        try {
            const { favoriteId } = req.params
            const body = req.body
            const uri = `${process.env.API_SOCIAL}/favorite/${favoriteId}`;
            const { data } = await axios.put(uri, body);

            return _messages.success(req, res, data)
        } catch (error) {
            console.log(error)
            return _messages.badRequest(error)
        }
    },

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
                            'system-user-key': process.env.CONNECT_CLIENT_KEY,
                        },
                    }
                );
                data = responseData;
            } catch (err) {
                console.error(err);
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
                'social',
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
                'social',
                'getActive'
            );
        }
    },
};
