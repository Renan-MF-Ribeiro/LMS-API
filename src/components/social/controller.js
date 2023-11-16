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
                {
                    _id: {
                        $in: data.blockedTrails.map((trail) => trail.trailId),
                    },
                },
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
            const blockedTrailsIdAndTitle = reqBody.blockedTrails.map(
                (trail) => ({
                    trailId: trail._id.toString(),
                    title: trail.title,
                })
            );

            const uri = `${process.env.API_SOCIAL}/client-config/${process.env.CLIENT_ID}`;
            const body = {
                commentModeration: reqBody.commentModeration,
                blockedTrails: blockedTrailsIdAndTitle,
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
            const uri = `${process.env.API_SOCIAL}/home/comment/${process.env.CLIENT_ID}`;
            const body = req.body;
            const { data } = await axios.post(uri, body);
            _messages.success(res, req, data, 'ok', 'social', 'createComment');
            return;
        } catch (error) {
            _messages.badRequest(
                res,
                req,
                'Operação inválida',
                'Operação inválida',
                'social',
                'createComment'
            );
            return;
        }
    },
    async getAllComments(req, res) {
        try {
            const uri = `${process.env.API_SOCIAL}/home/comment/${process.env.CLIENT_ID}`;
            const { data } = await axios.get(uri);

            _messages.success(res, req, data, 'ok', 'social', 'getAllComments');
            return;
        } catch (error) {
            _messages.badRequest(
                res,
                req,
                'Operação inválida',
                'Operação inválida',
                'social',
                'getAllComments'
            );
            return;
        }
    },
    async getCommentsByTrailId(req, res) {
        try {
            const { trailId } = req.params;
            const uri = `${process.env.API_SOCIAL}/home/comment/${trailId}`;
            const { data } = await axios.get(uri);

            _messages.success(
                res,
                req,
                data,
                'ok',
                'social',
                'getCommentsByTrailId'
            );
            return;
        } catch (error) {
            _messages.badRequest(
                res,
                req,
                'Operação inválida',
                'Operação inválida',
                'social',
                'getCommentsByTrailId'
            );
            return;
        }
    },
    async updateComment(req, res) {
        try {
            const { commentId } = req.params;
            const body = req.body;
            const uri = `${process.env.API_SOCIAL}/home/comment/${commentId}`;
            const { data } = await axios.put(uri, body);

            _messages.success(res, req, data, 'ok', 'social', 'updateComment');
            return;
        } catch (error) {
            _messages.badRequest(
                res,
                req,
                'Operação inválida',
                'Operação inválida',
                'social',
                'updateComment'
            );
            return;
        }
    },
    async createLike(req, res) {
        try {
            const uri = `${process.env.API_SOCIAL}/home/like/${process.env.CLIENT_ID}`;
            const body = req.body;
            const { data } = await axios.post(uri, body);

            _messages.success(res, req, data, 'ok', 'social', 'createLike');
            return;
        } catch (error) {
            console.log(error);
            _messages.badRequest(
                res,
                req,
                'Operação inválida',
                'Operação inválida',
                'social',
                'createLike'
            );
            return;
        }
    },
    async getLikesByTrailId(req, res) {
        try {
            const { trailId } = req.params;
            const uri = `${process.env.API_SOCIAL}/home/like/${trailId}`;
            const { data } = await axios.get(uri);
            console.log(data);
            _messages.success(
                res,
                req,
                data,
                'ok',
                'social',
                'getLikesByTrailId'
            );
            return;
        } catch (error) {
            console.log(error);
            _messages.badRequest(
                res,
                req,
                'Operação inválida',
                'Operação inválida',
                'social',
                'getLikesByTrailId'
            );
            return;
        }
    },
    async deleteLike(req, res) {
        try {
            const uri = `${process.env.API_SOCIAL}/home/like`;
            const body = req.body;
            const { data } = await axios.delete(uri, body);

            _messages.success(res, req, data, 'ok', 'social', 'deleteLike');
            return;
        } catch (error) {
            _messages.badRequest(
                res,
                req,
                'Operação inválida',
                'Operação inválida',
                'social',
                'deleteLike'
            );
            return;
        }
    },
    async createFavorite(req, res) {
        try {
            const uri = `${process.env.API_SOCIAL}/home/favorite/${process.env.CLIENT_ID}`;
            const body = req.body;
            const { data } = await axios.post(uri, body);

            _messages.success(res, req, data, 'ok', 'social', 'createFavorite');
            return;
        } catch (error) {
            _messages.badRequest(
                res,
                req,
                'Operação inválida',
                'Operação inválida',
                'social',
                'createFavorite'
            );
            return;
        }
    },
    async getFavoritesByUserId(req, res) {
        try {
            const { userId } = req.params;
            const uri = `${process.env.API_SOCIAL}/home/favorite/${userId}`;
            const { data } = await axios.get(uri);

            _messages.success(
                res,
                req,
                data,
                'ok',
                'social',
                'getFavoritesByUserId'
            );
            return;
        } catch (error) {
            _messages.badRequest(
                res,
                req,
                'Operação inválida',
                'Operação inválida',
                'social',
                'getFavoritesByUserId'
            );
            return;
        }
    },
    async updateFavorite(req, res) {
        try {
            const { favoriteId } = req.params;
            const body = req.body;
            const uri = `${process.env.API_SOCIAL}/home/favorite/${favoriteId}`;
            const { data } = await axios.put(uri, body);

            _messages.success(res, req, data, 'ok', 'social', 'updateFavorite');
            return;
        } catch (error) {
            _messages.badRequest(
                res,
                req,
                'Operação inválida',
                'Operação inválida',
                'social',
                'updateFavorite'
            );
            return;
        }
    },
    async shareSocialContent(req, res) {
        try {
            const { favoriteId } = req.params;
            const body = req.body;
            const uri = `${process.env.API_SOCIAL}/home/share/${process.env.CLIENT_ID}`;
            const { data } = await axios.put(uri, body);

            _messages.success(
                res,
                req,
                data,
                'ok',
                'social',
                'shareSocialContent'
            );
            return;
        } catch (error) {
            _messages.badRequest(
                res,
                req,
                'Operação inválida',
                'Operação inválida',
                'social',
                'shareSocialContent'
            );
            return;
        }
    },
};
