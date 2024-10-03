const { default: axios } = require('axios');
const _business = require('./business');
const _functions = require('../../utils/functions');
const _messages = require('../../utils/messages');
const {
    sendMessageToKafka,
    processTargetUsers,
} = require('../new-messages/business');
const { Trail } = require('../trails/model');
const { generateSSOToken } = require('../../utils/auth');
const { User } = require('../users/model');
const { UsersWithProcessedTags } = require('../courses/model')
const config = require('../../../config.json');
const { getTagsElegiblesByToken } = require('../sections/business');
const { ConfigModel } = require('../config/model');



module.exports = {
    async getConfig (req, res) {
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

            let blockedTrailsWithName = [];
            if (data.blockedTrails.length > 0) {
                blockedTrailsWithName = data.blockedTrails.map(
                    ({ trailId }) => ({
                        _id: trailId,
                        title: trails.find(
                            (trail) => trail._id.toString() === trailId
                        )?.title,
                    })
                );
            }

            const fields = (await ConfigModel.findOne({ type: 'social-fields' }))?.value ?? [];

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

    async getSocialStatus (req, res) {
        try {
            const userTags = await getTagsElegiblesByToken(req)
            const user = await _functions.getUserByToken(req)
            const uri = `${process.env.API_SOCIAL}/client-config/${process.env.CLIENT_ID}`;
            const { data } = await axios.get(uri);

            let trailBlocked = false;
            let tagBlocked = false;
            let userBlocked = false;

            if (data.blockedTrails.length > 0) {
                trailBlocked = data.blockedTrails.some((trail) => {
                    return trail.trailId === req.query.trailId
                })
                tagBlocked = data.tagsLists.blocked.some((tag) => {
                    return userTags.some((t) => {
                        return t.value === tag
                    })
                })
            }
            if (data.usersLists.blocked.length > 0) {
                userBlocked = data.usersLists.blocked.some((u) => {
                    return u.userId == user._id
                })

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

    async putConfig (req, res) {
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

                if (reqBody.fields) {
                    await ConfigModel.findOneAndUpdate(
                        { type: 'social-fields' },
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

    async getUsers (req, res) {
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

    async addOrRemoveFromUserList (req, res) {
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

    async createComment (req, res) {
        try {
            const uri = `${process.env.API_SOCIAL}/comments/${process.env.CLIENT_ID}`;
            const user = await _functions.getUserByToken(req)
            const userTags = await getTagsElegiblesByToken(req)

            const body = {
                ...req.body,
                userId: user._id,
                userName: user.name,
                userTags: userTags.map((tag) => tag.value)
            };
            const { data } = await axios.post(uri, body);
            _messages.success(res, req, data, 'ok', 'social', 'createComment');
            return;
        } catch (error) {
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

    async getAllComments (req, res) {
        try {
            const uri = `${process.env.API_SOCIAL}/comments/${process.env.CLIENT_ID}`;
            const { data } = await axios.get(uri, { params: req.query });

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

            const uri = `${process.env.API_SOCIAL}/comments/${process.env.CLIENT_ID}/${trailId}`;

            const { pageSize = 5, pageIndex = 0, ...query } = req.query;

            const setUsersProfilePhoto = async (commentsArr) => {
                const usersId = commentsArr.map((comment) => comment.userId);

                const usersPhoto = await User.find({ _id: { $in: usersId } }).select('profilePhoto');

                if (usersPhoto.length) {
                    commentsArr.forEach((comment) => {
                        const profilePhoto = usersPhoto.find((u) => String(u._id) === String(comment.userId))?.profilePhoto ?? null;
                        comment.profilePhoto = profilePhoto;
                    });
                }
            }

            // GET CONFIG
            const config = (await ConfigModel.findOne({ type: 'social-fields' }))?.value ?? [];

            if (!config?.length) {
                const { data: response } = await axios.get(uri, { params: req.query });

                const commentsToResponse = response.data ?? [];

                await setUsersProfilePhoto(commentsToResponse);

                _messages.success(
                    res,
                    req,
                    {
                        data: commentsToResponse,
                        total: response.total,
                        pageIndex: Number(pageIndex),
                        isFinished: Number(pageSize) * (Number(pageIndex) + 1) >= response.total
                    },
                    'ok',
                    'social',
                    'getCommentsByTrailId'
                );

                return;
            }

            const fetchComments = async (query) => await axios.get(uri, { params: query }, { validateStatus: false })

            const userInfo = await _functions.getUserByToken(req);

            const filter = config.reduce((acc, current) => {
                if (!userInfo[current]) return acc;

                acc[current] = userInfo[current]

                return acc;
            }, {})

            // GET USERS
            const dbUsersInSameConditions = await User.find(filter).select('_id');

            const commentsToResponse = [];

            const usersToFilter = dbUsersInSameConditions.map(user => String(user._id));

            const filterCommentsByUserId =
                (commentsArr) => commentsArr.filter((comment) => usersToFilter.includes(String(comment.userId)));

            let isFinishedFromSocialApi = false;
            let internalIsFinished = false;
            let currentPage = Number(pageIndex);

            while (!internalIsFinished && !isFinishedFromSocialApi) {
                console.log('query', { pageSize, pageIndex: currentPage, ...query });
                const { data: response } = await fetchComments({ pageSize, pageIndex: currentPage, ...query });

                const responseData = response.data ?? [];

                const filteredComments = filterCommentsByUserId(responseData);

                commentsToResponse.push(...filteredComments);

                console.log('é maior', commentsToResponse.length, commentsToResponse.length >= Number(pageSize));
                console.log('RESPONSE TEM LENGTH', !responseData?.length);

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

            _messages.success(
                res,
                req,
                { data: commentsToResponse, total: commentsToResponse?.length ? 100 : 0, pageIndex: currentPage, isFinished: isFinishedFromSocialApi },
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

    async updateComment (req, res) {
        try {
            const { commentId } = req.params;
            const body = req.body;
            const uri = `${process.env.API_SOCIAL}/comments/${commentId}`;
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

    async getPendingComments (req, res) {
        try {
            const uri = `${process.env.API_SOCIAL}/comments/${process.env.CLIENT_ID}/pending`;
            const { searchBy, ...query } = req.query
            const searchByTrailOrUser = await _business.handleSearchByTrailOrUser(searchBy)

            const { data } = await axios.get(uri, {
                params: {
                    ...query,
                    ...(searchBy && {
                        searchBy: searchByTrailOrUser.length ? searchByTrailOrUser.flat() : searchBy
                    })
                }
            });
            const comments = await _business.handleUserNameAndTrailTitle(data)

            _messages.success(res, req, comments, 'ok', 'social', 'getPendingComments');
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

    async getApprovedComments (req, res) {
        try {
            const uri = `${process.env.API_SOCIAL}/comments/${process.env.CLIENT_ID}/approved`;
            const { searchBy, ...query } = req.query
            const searchByTrailOrUser = await _business.handleSearchByTrailOrUser(searchBy)

            const { data } = await axios.get(uri, {
                params: {
                    ...query,
                    ...(searchBy && {
                        searchBy: searchByTrailOrUser.length ? searchByTrailOrUser.flat() : searchBy
                    })
                }
            });
            const comments = await _business.handleUserNameAndTrailTitle(data)

            _messages.success(res, req, comments, 'ok', 'social', 'getApprovedComments');
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

    async getRejectedComments (req, res) {
        try {
            const uri = `${process.env.API_SOCIAL}/comments/${process.env.CLIENT_ID}/rejected`;
            const { searchBy, ...query } = req.query
            const searchByTrailOrUser = await _business.handleSearchByTrailOrUser(searchBy)

            const { data } = await axios.get(uri, {
                params: {
                    ...query,
                    ...(searchBy && {
                        searchBy: searchByTrailOrUser.length ? searchByTrailOrUser.flat() : searchBy
                    })
                }
            });
            const comments = await _business.handleUserNameAndTrailTitle(data)

            _messages.success(res, req, comments, 'ok', 'social', 'getRejectedComments');
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

    async updateCommentStatus (req, res) {
        try {
            const { commentId } = req.params
            const uri = `${process.env.API_SOCIAL}/comments/${process.env.CLIENT_ID}/${commentId}`;
            const body = req.body;
            const { data } = await axios.patch(uri, body);

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

    async createLike (req, res) {
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

    async getLikesByTrailId (req, res) {
        try {
            let allowed = false
            let blocked = false
            let moderated = false
            const { trailId, userId } = req.params;
            const uri = `${process.env.API_SOCIAL}/home/like/${process.env.CLIENT_ID}/${trailId}/${userId}`;
            const { data } = await axios.get(uri);
            const { users } = data

            if (users) {
                for (const user of users.allowed) {
                    if (user.userId == userId) {
                        allowed = true
                        data.userAllowed = allowed
                    }
                }

                for (const user of users.blocked) {
                    if (user.userId == userId) {
                        blocked = true
                        data.userBlocked = blocked
                    }
                }

                for (const user of users.moderated) {
                    if (user.userId == userId) {
                        moderated = true
                        data.userModerated = moderated
                    }
                }
            }

            delete data.users

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

    async deleteLike (req, res) {
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

    async createFavorite (req, res) {
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

    async getFavoritesByUserId (req, res) {
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

    async updateFavorite (req, res) {
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

    async shareSocialContent (req, res) {
        try {
            const { name } = await _functions.getUserByToken(req);
            const { users, trailId } = req.body;

            for (let id of users) {
                const trail = await Trail.findById(trailId, 'title titleURL');

                const text = `Olá! O usuário ${name} compartilhou a trilha ${trail.title} com você!`;
                const texthtml = `<br> <p>Olá! O usuário ${name} compartilhou a trilha ${trail.title} com você!</p> <br>`;
                const message = {
                    category: 'notify',
                    communication: ['notification', 'email'],
                    mode: 'manual',
                    target: {
                        type: 'users',
                        value: {
                            users: [id],
                        },
                    },
                    text: text,
                    texthtml: texthtml,
                    thumbnail: config.messenger.emailTemplate.thumbnail,
                    title: `Happlearning - ${name} compartilhou um conteúdo com você!`,
                };
                createMessagesFromBackend(message)
            }

            const uri = `${process.env.API_SOCIAL}/home/share/${process.env.CLIENT_ID}`;
            const { data } = await axios.post(uri, { users: users, trailId });

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
            console.log(error)
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

    async getUsersElegibleForSharing (req, res) {
        try {
            const { trailId, searchBy } = req.query;
            const elegibleUsers = []

            const usersWithTags = await User.find({
                name: { $regex: searchBy, $options: 'i' }
            }).lean().select('name networkLogin').limit(10);

            // for (const user of users) {
            //     elegibleUsers.push({ name: user.name, _id: user._id, networkLogin: user.networkLogin })
            // }

            _messages.success(
                res,
                req,
                usersWithTags,
                'ok',
                'social',
                'getShareTargets'
            );
            return;
        } catch (error) {
            console.log(error)
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

    async getShareTargets (req, res) {
        try {
            const { users, trailId } = req.body;
            const returnUsers = []

            const trail = await Trail.findById(trailId, 'title titleURL tags -_id');

            const tags = trail.tags.map((e) => e.value);

            for (let user of users) {
                const userWithTags = await UsersWithProcessedTags.find({ networkLogin: user.networkLogin, userTags: { $in: tags } }).lean().limit(10);
                returnUsers.push({ _id: user._id, elegible: userWithTags.length > 0 ? true : false })
            }

            _messages.success(
                res,
                req,
                returnUsers,
                'ok',
                'social',
                'getShareTargets'
            );
            return;
        } catch (error) {
            console.log(error)
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
};

async function createMessagesFromBackend (body) {
    try {
        const campaign = body;
        const target = campaign.target;
        let targetUsers = [];

        if (!target.value.user) {
            targetUsers = await processTargetUsers(target, campaign.category);
        } else {
            targetUsers.push({ ...target.value.user });
        }

        await sendMessageToKafka(campaign, targetUsers);
    } catch (error) {
        console.log(error);
    }
}
