const { socialApi } = require('./http-adapter');
const { newsApi } = require('../news/http-adapter');
const _business = require('./business');
const _functions = require('../../utils/functions');
const _messages = require('../../utils/messages');
const { Trail } = require('../trails/model');
const { User } = require('../users/model');
const { getTagsElegiblesByToken, checkEligibilityTagsAnd } = require('../sections/business');
const { ConfigModel, ConfigTypes } = require('../config/model');
const { Group } = require('../groups/model');
const { createNotification } = require('../feed/business');
const GamificationKafka = require('../gamification/kafka/broker');
const { EVENT_CATEGORY } = require('../gamification/model');
const { COMMENT_STATUS } = require('./model');
const { UsersWithProcessedTags } = require('../courses/model');

async function getComments(uri, req, res) {
    const { pageSize = 5, pageIndex = 0, ...query } = req.query;

    const setUsersProfilePhoto = async (commentsArr) => {
        const usersId = commentsArr.map((comment) => comment.userId);

        const usersPhoto = await User.find({
            _id: { $in: usersId },
            profilePhoto: { $exists: true, $ne: null },
            status: 'ATIVO',
        }).select('profilePhoto').lean();

        const photoMap = new Map(
            usersPhoto.map((user) => [String(user._id), user.profilePhoto])
        );

        if (usersPhoto.length) {
            commentsArr.forEach((comment) => {
                const profilePhoto = photoMap.get(String(comment.userId)) ?? null;
                comment.profilePhoto = profilePhoto;
            });
        }
    };

    const config =
        (await ConfigModel.findOne({ type: ConfigTypes.SocialFields }))?.value ?? [];

    if (!config?.length) {
        const { data: response } = await socialApi.get(uri, { params: req.query });

        const commentsToResponse = response.data ?? [];

        await setUsersProfilePhoto(commentsToResponse);

        _messages.success(
            res,
            req,
            {
                data: commentsToResponse,
                total: response.total,
                pageIndex: Number(pageIndex),
                isFinished: Number(pageSize) * (Number(pageIndex) + 1) >= response.total,
            },
            'ok',
            'social',
            'getCommentsByTrailId'
        );

        return;
    }

    const fetchComments = (params) => {
        return socialApi.get(uri, { params }, { validateStatus: false });
    };

    const userInfo = await _functions.getUserByToken(req);

    const filter = config.reduce((acc, current) => {
        acc[current] = userInfo[current] ?? null;
        return acc;
    }, {});

    const dbUsersInSameConditions = await User.find({
        ...filter,
        status: 'ATIVO',
    }).select('_id');

    const commentsToResponse = [];

    const usersToFilter = dbUsersInSameConditions.map((user) => String(user._id));

    const usersToFilterSet = new Set(usersToFilter);

    const filterCommentsByUserId = (commentsArr) => {
        return commentsArr.filter((comment) => usersToFilterSet.has(String(comment.userId)));
    };

    let isFinishedFromSocialApi = false;
    let internalIsFinished = false;
    let currentPage = Number(pageIndex);
    const limitPage = 1000; // Limit to avoid too many requests

    while (
        !internalIsFinished
        && !isFinishedFromSocialApi
        && currentPage <= limitPage // Limit the number of pages to avoid infinite loop
    ) {
        const { data: response } = await fetchComments({
            pageSize,
            pageIndex: currentPage,
            ...query,
        });

        const responseData = response.data ?? [];

        const filteredComments = filterCommentsByUserId(responseData);

        commentsToResponse.push(...filteredComments);

        if (!responseData?.length ?? responseData.length < Number(pageSize)) {
            isFinishedFromSocialApi = true;
        }

        if (commentsToResponse.length >= Number(pageSize)) {
            internalIsFinished = true;
        }

        if (!internalIsFinished && !isFinishedFromSocialApi) {
            currentPage += 1;
        }
    }

    await setUsersProfilePhoto(commentsToResponse);

    return _messages.success(
        res,
        req,
        {
            data: commentsToResponse,
            total: commentsToResponse?.length ?? 0,
            pageIndex: currentPage,
            isFinished: isFinishedFromSocialApi,
        },
        'ok',
        'social',
        `getComments_${uri}`
    );
}

module.exports = {
    async getConfig(req, res) {
        try {
            const uri = `client-config/${process.env.CLIENT_ID}`;
            const { data } = await socialApi.get(uri);

            const trails = await Trail.find(
                {
                    _id: {
                        $in: data.blockedTrails.map((trail) => trail.trailId),
                    },
                },
                'title'
            );

            let blockedTrailsWithName = [];
            if (data.blockedTrails.length > 0) {
                blockedTrailsWithName = data.blockedTrails.map(({ trailId }) => ({
                    _id: trailId,
                    title: trails.find((trail) => trail._id.toString() === trailId)?.title,
                }));
            }

            const fields =
                (await ConfigModel.findOne({ type: ConfigTypes.SocialFields }))?.value ?? [];

            _messages.success(
                res,
                req,
                { ...data, blockedTrails: blockedTrailsWithName, fields },
                'configurações encontradas',
                'social',
                'getConfig'
            );
        } catch (error) {
            console.log(error);
            _messages.internalServer(res, req, error.message, null, 'social', 'getConfig');
        }
    },

    async getSocialStatus(req, res) {
        try {
            const userTags = await getTagsElegiblesByToken(req);
            const user = await _functions.getUserByToken(req);

            const uri = `client-config/${process.env.CLIENT_ID}`;

            const { data } = await socialApi.get(uri);

            let trailBlocked = false;
            let tagBlocked = false;
            let userBlocked = false;

            if (data.blockedTrails.length > 0) {
                trailBlocked = data.blockedTrails.some((trail) => {
                    return trail.trailId === req.query.trailId;
                });
            }
            tagBlocked = data.tagsLists.blocked.some((tag) => {
                return userTags.some((t) => {
                    return t.value === tag;
                });
            });
            if (data.usersLists.blocked.length > 0) {
                userBlocked = data.usersLists.blocked.some((u) => {
                    return u.userId == user._id;
                });
            }

            _messages.success(
                res,
                req,
                { trailBlocked, tagBlocked, userBlocked },
                'configurações encontradas',
                'social',
                'getConfig'
            );
        } catch (error) {
            console.log(error);
            _messages.internalServer(res, req, error.message, null, 'social', 'getConfig');
        }
    },

    async getNewsSocialStatus(req, res) {
        try {
            const userTags = await getTagsElegiblesByToken(req);
            const user = await _functions.getUserByToken(req);

            const uri = `client-config/${process.env.CLIENT_ID}`;

            const { data } = await socialApi.get(uri);

            let tagBlocked = false;
            let userBlocked = false;

            if (data.blockedTrails.length > 0) {
                tagBlocked = data.tagsLists.blocked.some((tag) => {
                    return userTags.some((t) => {
                        return t.value === tag;
                    });
                });
            }
            if (data.usersLists.blocked.length > 0) {
                userBlocked = data.usersLists.blocked.some((u) => {
                    return u.userId == user._id;
                });
            }

            _messages.success(
                res,
                req,
                { tagBlocked, userBlocked },
                'configurações encontradas',
                'social',
                'getConfig'
            );
        } catch (error) {
            console.log(error);
            _messages.internalServer(res, req, error.message, null, 'social', 'getConfig');
        }
    },

    async putConfig(req, res) {
        try {
            const reqBody = req.body;
            const blockedTrailsIdAndTitle = reqBody.blockedTrails.map((trail) => ({
                trailId: trail._id.toString(),
                title: trail.title,
            }));

            const body = {
                commentModeration: reqBody.commentModeration,
                blockedTrails: blockedTrailsIdAndTitle,
                tagsLists: reqBody.tagsLists,
                usersLists: reqBody.usersLists,
            };

            try {
                const uri = `client-config/${process.env.CLIENT_ID}`;
                const { data } = await socialApi.put(uri, body);

                if (reqBody.fields) {
                    await ConfigModel.findOneAndUpdate(
                        { type: ConfigTypes.SocialFields },
                        { value: reqBody.fields },
                        { upsert: true, new: true }
                    );
                }

                return _messages.success(
                    res,
                    req,
                    data,
                    'configurações atualizadas',
                    'social',
                    'putConfig'
                );
            } catch (err) {
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
            _messages.internalServer(res, req, error.message, null, 'social', 'putConfig');
        }
    },

    async getUsers(req, res) {
        try {
            const { skip, limit } = _functions.pagination(req);
            const { order, sort } = _functions.ordernation(req);
            const searchBy = req.query.searchBy;
            const options = { skip, limit, order, sort, searchBy };

            const uri = `client-config/${process.env.CLIENT_ID}`;
            const response = await socialApi.get(uri);

            const {
                allowed: allowedIdsList,
                blocked: blockedIdsList,
                moderated: moderatedIdsList,
            } = response.data.usersLists;

            const allowed = await _business.getUsersByIdsList(allowedIdsList, options);
            const blocked = await _business.getUsersByIdsList(blockedIdsList, options);
            const moderated = await _business.getUsersByIdsList(moderatedIdsList, options);

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
            _messages.internalServer(res, req, error.message, null, 'social', 'getUsers');
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
            const { userId, idsList } = req.body;
            const date = new Date();

            const body = {
                user: {
                    userId: userId,
                    collaboratorId: collaborator._id,
                    updatedAt: date,
                },
                userList: idsList.map((id) => ({
                    userId: id,
                    collaboratorId: collaborator._id,
                    updatedAt: date,
                })),
                operation,
                listName,
            };

            try {
                const uri = `client-config/users-lists/${process.env.CLIENT_ID}`;
                const response = await socialApi.patch(uri, body);

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
                        JSON.stringify(error.response.data.message),
                        `bad request to social: ${error.response.data.message}`,
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
            const uri = 'comments';
            const { data } = await socialApi.post(uri, req.body);

            await GamificationKafka.publishEventRuleValidation({
                events: [EVENT_CATEGORY.COMMENT],
                identifier: req.body.userId,
                meta: {
                    trailId: req.body.trailId,
                    commentId: data._id
                }
            })

            _messages.success(res, req, data, 'ok', 'social', 'createComment');
            return;
        } catch (error) {
            console.log({ error });
            _messages.badRequest(
                res,
                req,
                error.response.data.message,
                error.response.data.message,
                'social',
                'createComment'
            );
        }
    },

    async getAllComments(req, res) {
        try {
            const uri = 'comments';
            const { data } = await socialApi.get(uri, { params: req.query });

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
        return getComments(`comments/${req.params.trailId}`, req, res);
    },

    async getCommentsByNewsId(req, res) {
        return getComments(`comments/news/${req.params.newsId}`, req, res);
    },

    async updateComment(req, res) {
        try {
            const { commentId } = req.params;
            const body = req.body;

            const uri = `comments/${commentId}`;

            const { data } = await socialApi.put(uri, body);

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

    async getPendingComments(req, res) {
        try {
            const uri = 'comments/pending';
            const { searchBy, paginated = true, ...query } = req.query;
            const searchByTrailOrUser = await _business.handleSearchByTrailOrUser(searchBy);

            const response = await socialApi.get(uri, {
                params: {
                    ...query,
                    ...(searchBy && {
                        searchBy: searchByTrailOrUser.length
                            ? searchByTrailOrUser.flat()
                            : searchBy,
                    }),
                    paginated: Boolean(paginated),
                },
            });

            const rawData = paginated ? response.data.data : response.data;
            const commentsArray = await _business.handleUserNameAndTrailTitle(rawData);

            if (paginated) {
                const comments = {
                    data: [...commentsArray],
                    total: response.data.total,
                }
                _messages.success(res, req, comments, 'ok', 'social', 'getPendingComments');
                return;
            }

            _messages.success(res, req, commentsArray, 'ok', 'social', 'getPendingComments');
            return;
        } catch (error) {
            _messages.badRequest(
                res,
                req,
                'Operação inválida',
                'Operação inválida',
                'social',
                'getPendingComments'
            );
            return;
        }
    },

    async getApprovedComments(req, res) {
        try {
            const uri = 'comments/approved';
            const { searchBy, paginated = true, ...query } = req.query;
            const searchByTrailOrUser = await _business.handleSearchByTrailOrUser(searchBy);

            const response = await socialApi.get(uri, {
                params: {
                    ...query,
                    ...(searchBy && {
                        searchBy: searchByTrailOrUser.length
                            ? searchByTrailOrUser.flat()
                            : searchBy,

                    }),
                    paginated: Boolean(paginated),
                },
            });

            const rawData = paginated ? response.data.data : response.data;
            const commentsArray = await _business.handleUserNameAndTrailTitle(rawData);

            if (paginated) {
                const comments = {
                    data: [...commentsArray],
                    total: response.data.total,
                }

                _messages.success(res, req, comments, 'ok', 'social', 'getApprovedComments');
                return;
            }

            _messages.success(res, req, commentsArray, 'ok', 'social', 'getApprovedComments');
            return;
        } catch (error) {
            console.log(error);
            _messages.badRequest(
                res,
                req,
                'Operação inválida',
                'Operação inválida',
                'social',
                'getApprovedComments'
            );
            return;
        }
    },

    async getRejectedComments(req, res) {
        try {
            const uri = 'comments/rejected';
            const { searchBy, paginated = true, ...query } = req.query;
            const searchByTrailOrUser = await _business.handleSearchByTrailOrUser(searchBy);

            const response = await socialApi.get(uri, {
                params: {
                    ...query,
                    ...(searchBy && {
                        searchBy: searchByTrailOrUser.length
                            ? searchByTrailOrUser.flat()
                            : searchBy,
                    }),
                    paginated: Boolean(paginated),
                },
            });

            const rawData = paginated ? response.data.data : response.data;
            const commentsArray = await _business.handleUserNameAndTrailTitle(rawData);

            if (paginated) {
                const comments = {
                    data: [...commentsArray],
                    total: response.data.total,
                }
                _messages.success(res, req, comments, 'ok', 'social', 'getRejectedComments');
                return;
            }

            _messages.success(res, req, commentsArray, 'ok', 'social', 'getRejectedComments');
            return;
        } catch (error) {
            console.log(error);
            _messages.badRequest(
                res,
                req,
                'Operação inválida',
                'Operação inválida',
                'social',
                'getRejectedComments'
            );
            return;
        }
    },

    async updateCommentStatus(req, res) {
        try {
            const { commentId } = req.params;
            const body = req.body;

            const uri = `comments/${commentId}`;

            const { data } = await socialApi.patch(uri, body);

            if (data?.status === COMMENT_STATUS.APPROVED) {
                await GamificationKafka.publishEventRuleValidation({
                    events: [EVENT_CATEGORY.COMMENT],
                    identifier: data.userId,
                    meta: {
                        commentId,
                        trailId: data.trailId
                    }
                })
            }

            _messages.success(res, req, data, 'ok', 'social', 'updateCommentStatus');
            return;
        } catch (error) {
            console.log(error);
            _messages.badRequest(
                res,
                req,
                'Operação inválida',
                'Operação inválida',
                'social',
                'updateCommentStatus'
            );
            return;
        }
    },

    async createLike(req, res) {
        try {
            const uri = `home/like/${process.env.CLIENT_ID}`;
            const body = req.body;
            const { data } = await socialApi.post(uri, body);

            if (data.target) {
                await GamificationKafka.publishEventRuleValidation({
                    events: [EVENT_CATEGORY.LIKE],
                    identifier: data.userId,
                    meta: {
                        trailId: data.trailId,
                    },
                });
            }

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
            let allowed = false;
            let blocked = false;
            let moderated = false;
            const { trailId, userId } = req.params;
            const uri = `home/like/${process.env.CLIENT_ID}/${trailId}/${userId}`;
            const { data } = await socialApi.get(uri);
            const { users } = data;

            if (users) {
                for (const user of users.allowed) {
                    if (user.userId == userId) {
                        allowed = true;
                        data.userAllowed = allowed;
                    }
                }

                for (const user of users.blocked) {
                    if (user.userId == userId) {
                        blocked = true;
                        data.userBlocked = blocked;
                    }
                }

                for (const user of users.moderated) {
                    if (user.userId == userId) {
                        moderated = true;
                        data.userModerated = moderated;
                    }
                }
            }

            delete data.users;

            _messages.success(res, req, data, 'ok', 'social', 'getLikesByTrailId');
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

    async getLikesByNewsId(req, res) {
        try {
            let allowed = false;
            let blocked = false;
            let moderated = false;
            const { newsId, userId } = req.params;
            const uri = `home/like/news/${process.env.CLIENT_ID}/${newsId}/${userId}`;
            const { data } = await socialApi.get(uri);
            const { users } = data;

            if (users) {
                for (const user of users.allowed) {
                    if (user.userId == userId) {
                        allowed = true;
                        data.userAllowed = allowed;
                    }
                }

                for (const user of users.blocked) {
                    if (user.userId == userId) {
                        blocked = true;
                        data.userBlocked = blocked;
                    }
                }

                for (const user of users.moderated) {
                    if (user.userId == userId) {
                        moderated = true;
                        data.userModerated = moderated;
                    }
                }
            }

            delete data.users;

            _messages.success(res, req, data, 'ok', 'social', 'getLikesByTrailId');
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
            const uri = 'home/like';
            const body = req.body;
            const { data } = await socialApi.delete(uri, body);

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
            const uri = `home/favorite/${process.env.CLIENT_ID}`;
            const body = req.body;
            const { data } = await socialApi.post(uri, body);

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
            const uri = `home/favorite/${userId}`;
            const { data } = await socialApi.get(uri);

            _messages.success(res, req, data, 'ok', 'social', 'getFavoritesByUserId');
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
            const uri = `home/favorite/${favoriteId}`;
            const { data } = await socialApi.put(uri, body);

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
        const { users, trailId } = req.body;
        try {
            const { _id, networkLogin, name } = await _functions.getUserByToken(req);

            const trail = await Trail.findById(trailId, 'title titleURL');

            if (users) {
                const config = {
                    reqUser: name,
                    communication: ['notification', 'email'],
                    type: 'share',
                    contentType: 'trail',
                    contentName: trail.title,
                    contentId: trail._id,
                };
                await createNotification(config, users);
            }

            const uri = `home/share/${process.env.CLIENT_ID}`;
            const { data } = await socialApi.post(uri, {
                users: users,
                trailId,
                sharedBy: {
                    userId: _id,
                    userName: networkLogin,
                },
            });

            if (data?.users?.length > 0) {
                await GamificationKafka.publishEventRuleValidation({
                    events: [EVENT_CATEGORY.SHARE, EVENT_CATEGORY.SHARED_CONTENT],
                    identifier: data.sharedBy.userId,
                    meta: {
                        trailId: data.trailId,
                    },
                });
            }

            _messages.success(res, req, data, 'ok', 'social', 'shareSocialContent');
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

    async shareNewsSocialContent(req, res) {
        const { users, newsId } = req.body;
        try {
            const { _id, networkLogin, name } = await _functions.getUserByToken(req);

            if (users) {
                const config = {
                    reqUser: name,
                    communication: ['notification', 'email'],
                    type: 'share',
                    contentType: 'news',
                    contentId: newsId,
                };
                await createNotification(config, users);
            }

            const uri = `home/share/${process.env.CLIENT_ID}`;
            const { data } = await socialApi.post(uri, {
                users: users,
                newsId,
                sharedBy: {
                    userId: _id,
                    userName: networkLogin,
                },
            });

            if (data?.users?.length > 0) {
                await GamificationKafka.publishEventRuleValidation({
                    events: [EVENT_CATEGORY.SHARE, EVENT_CATEGORY.SHARED_CONTENT],
                    identifier: data.sharedBy.userId,
                    meta: {
                        trailId: data.trailId,
                    },
                });
            }

            _messages.success(res, req, data, 'ok', 'social', 'shareSocialContent');
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

    async getUsersElegibleForSharing(req, res) {
        try {
            const { trailId, searchBy } = req.query;
            const elegibleUsers = [];

            const usersWithTags = await User.find({
                name: { $regex: searchBy, $options: 'i' },
            })
                .lean()
                .select('name networkLogin')
                .limit(10);

            // for (const user of users) {
            //     elegibleUsers.push({ name: user.name, _id: user._id, networkLogin: user.networkLogin })
            // }

            _messages.success(res, req, usersWithTags, 'ok', 'social', 'getShareTargets');
            return;
        } catch (error) {
            console.log(error);
            _messages.badRequest(
                res,
                req,
                'Operação inválida',
                'Operação inválida',
                'social',
                'getShareTargets'
            );
            return;
        }
    },

    async getShareTargets(req, res) {
        try {
            const { users = [], trailId } = req.body;

            const trail = await Trail.findById(trailId, '_id tags tagsAnd').lean();

            if (!trail) {
                _messages.success(
                    res,
                    req,
                    users.map((u) => ({ ...u, elegible: false })),
                    'ok',
                    'social',
                    'getShareTargets'
                );
                return;
            }

            const availableUsers = await User.find({
                networkLogin: { $in: users.map((u) => u.networkLogin) },
                status: 'ATIVO',
            })
                .select('_id tags groupsAD status')
                .lean();

            if (!availableUsers.length) {
                _messages.success(
                    res,
                    req,
                    users.map((u) => ({ ...u, elegible: false })),
                    'ok',
                    'social',
                    'getShareTargets'
                );
                return;
            }

            const groups = await Group.find({
                name: { $in: availableUsers.map((u) => u.groupsAD).flat() },
            })
                .select('tags name')
                .lean();

            const returnUsers = availableUsers.map((user) => {
                const groupTags = groups
                    .filter((g) => (user.groupsAD ?? []).includes(g.name))
                    .map((g) => g.tags)
                    .flat();

                const userTags = (user.tags ?? []).concat(user.groupsAD ?? []).concat(groupTags);

                return {
                    _id: user._id,
                    elegible: checkEligibilityTagsAnd(userTags, trail.tagsAnd, trail.tags),
                };
            });

            _messages.success(res, req, returnUsers, 'ok', 'social', 'getShareTargets');
            return;
        } catch (error) {
            console.log(error);
            _messages.badRequest(
                res,
                req,
                'Operação inválida',
                'Operação inválida',
                'social',
                'getShareTargets'
            );
            return;
        }
    },

    async getNewsShareTargets(req, res) {
        try {
            const { users = [], campaignId } = req.body;

            const { data } = await newsApi.get(`/campaigns/${campaignId}`, {
                headers: {
                    Authorization: `Bearer ${req.headers.authorization}`
                }
            });

            const tags = data.eligibilities;
            if (!tags || tags.length === 0) {
                _messages.success(
                    res,
                    req,
                    users.map((u) => ({ ...u, elegible: false })),
                    'ok',
                    'social',
                    'getShareTargets'
                );
                return;
            }

            const availableUsers = await User.find({
                networkLogin: { $in: users.map((u) => u.networkLogin) },
                status: 'ATIVO',
            })
                .select('_id tags groupsAD status')
                .lean();

            if (!availableUsers.length) {
                _messages.success(
                    res,
                    req,
                    users.map((u) => ({ ...u, elegible: false })),
                    'ok',
                    'social',
                    'getShareTargets'
                );
                return;
            }


            const usersWithTags = await UsersWithProcessedTags.find({
                userTags: { $in: tags },
            });
            const returnUsers = availableUsers.map((user) => {
                const userTags = (user.tags ?? []).concat(user.groupsAD ?? []);
                const elegible = usersWithTags.some((u) =>
                    userTags.some((tag) => u.userTags.includes(tag))
                );

                return {
                    _id: user._id,
                    elegible,
                };
            });

            _messages.success(res, req, returnUsers, 'ok', 'social', 'getShareTargets');
            return;
        } catch (error) {
            console.log(error);
            _messages.badRequest(
                res,
                req,
                'Operação inválida',
                'Operação inválida',
                'social',
                'getShareTargets'
            );
            return;
        }
    },

    async findGroupsManagedByUser(req, res) {
        try {
            const uri = 'groups/managed';
            const { data } = await socialApi.get(uri);

            _messages.success(res, req, data);
        } catch (error) {
            console.log({ error });
            _messages.badRequest(
                res,
                req,
                'Operação inválida',
                'Operação inválida',
                'social',
                'findGroupsManagedByUser'
            );
        }
    },
};
