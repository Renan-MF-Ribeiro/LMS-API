const {
    getUserByToken,
    pagination,
    ordernation,
    sortByField,
} = require('../../../utils/functions');
const _messages = require('../../../utils/messages');
const { socialApi } = require('../../social/http-adapter');
const { populateUserFields, createNotification, getSegFieldsFromUser, populateSingleData } = require('../buisiness');
const {
    populateUserFields,
    createNotification,
    getSegFieldsFromUser,
    populateSingleData,
    handleUserPostNotification,
} = require('../business');
const fs = require('fs');
const mime = require('mime-types');
const FormData = require('form-data');
const {
    getSegmentation,
    isSegmentationException,
} = require('../../config/business');

const GamificationKafka = require('../../gamification/kafka/broker');
const { EVENT_CATEGORY } = require('../../gamification/model');

module.exports = {
    async create(req, res) {
        const userCustomElegeFields = await getSegFieldsFromUser(req);
        const body = JSON.parse(req.fields.payload) ?? null;

        body.userCustomElegeFields = userCustomElegeFields;
        try {
            const segmentation = await getSegmentation();

            if (segmentation.value?.rule?.issuer) {
                const expectedField = segmentation.value.rule.issuer;
                const user = await getUserByToken(req);
                const userField = user[expectedField]?.toLowerCase();
                if (userField) {
                    body.owner = userField;
                }
            }

            delete body.content;
            const uri = 'posts';
            const { data } = await socialApi.post(uri, body);

             if (Object.keys(req?.files).length > 0) {
                const uploadContent = `posts/${data.post._id}/content`;

                const formData = new FormData();

                 Object.keys(req?.files).forEach((key, i) => {
                     const file = req?.files[key];

                     const filename = `${i}-${file.name.replace(/ /g, '-')}`;

                     formData.append(filename, fs.createReadStream(file.path), {
                         filename,
                         contentType: file.type,
                     });
                 });

                const result = await socialApi.patch(uploadContent, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        ...formData.getHeaders(),
                    },
                });

                 if (result?.data && data?.post) {
                     data.post.content = result.data;
                 }
            }

            if (body.notifyUsers === true && (body?.elegibilities || body?.elegibilitiesAnd)) {
                const users = await getUsersByTags(body.elegibilities, body?.elegibilitiesAnd);

                const config = {
                    reqUser: 'Equipe de comunicação',
                    communication: ['notification', 'email'],
                    type: 'admin_post',
                    contentType: 'post',
                    contentId: data?.post?._id,
                    targetType: 'tag',
                };

                await createNotification(config, users);
            }

            await handleUserPostNotification(data?.post);            

            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'create'
            );
        }
    },

    async findRecentPosts(req, res) {
        const uri = `posts/new`;

        const { data } = await socialApi.get(uri, { params: req.query });
        let response = { data, total: data.total };
        if (data) {
            const PopulatedData = await populateUserFields('user', 'userId', data);
            response = { data: PopulatedData, total: data.total };
        }

        return _messages.success(res, req, response);
    },

    async reportPost(req, res) {
        const { postId } = req.params;
        const uri = `posts/report/${postId}`;

        try {
            const { data } = await socialApi.post(uri, req.body);

            return _messages.success(res, req, data);
        } catch (error) {
            if (error.response?.status === 401) {
                return _messages.unauthorized(
                    res,
                    req,
                    error.message,
                    error.response?.data?.message,
                    'reportPost'
                );
            }

            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'reportPost'
            );
        }
    },
    async handleReportedPost(req, res) {
        const { postId } = req.params;
        const uri = `posts/report/handle/${postId}`;

        try {
            const { data } = await socialApi.post(uri);
            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'reportPost'
            );
        }
    },

    async findAllPosts(req, res) {
        try {
            const { myPosts, groupId } = req.query;

            if (groupId) {
                const uri = `posts/groups/${groupId}`;
                const { data } = await socialApi.get(uri, { params: req.query });

                if (myPosts === 'true') {
                    const { _id } = await getUserByToken(req);
                    data.data = data.data.filter((post) => _id.equals(post.userId));
                }

                const PopulatedData = await populateUserFields('user', 'userId', data);
                const response = { data: PopulatedData, total: data.total };

                return _messages.success(res, req, response);
            } else {
                const uri = myPosts === 'false' ? 'posts/public' : 'posts/me';
                const { data } = await socialApi.get(uri, { params: req.query });

                const PopulatedData = await populateUserFields('user', 'userId', data);
                const response = { data: PopulatedData, total: data.total };

                return _messages.success(res, req, response);
            }
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'findAllPosts'
            );
        }
    },

    async findAllByGroup(req, res) {
        try {
            const { groupId } = req.params;
            const uri = `posts/groups/${groupId}`;
            const { data } = await socialApi.get(uri, { params: req.query });

            const PopulatedData = await populateUserFields('user', 'userId', data);
            const response = { data: PopulatedData, total: data.total };

            return _messages.success(res, req, response);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'findAllByGroup'
            );
        }
    },

    async findAllPublic(req, res) {
        try {
            const uri = 'posts/public';
            const { data } = await socialApi.get(uri, { params: req.query });

            const PopulatedData = await populateUserFields('user', 'userId', data);
            const response = { data: PopulatedData, total: data.total };

            return _messages.success(res, req, response);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'findAllPublic'
            );
        }
    },

    async getFeed(req, res) {
        try {
            const uri = 'posts/feed';
            const { data } = await socialApi.get(uri, { params: req.query });

            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'getFeed'
            );
        }
    },
    async listPostToBeModerated(req, res) {
        const { status, type, reports, searchBy, orderBy, direction, ...query } = req.query;
        const queryParams = { ...query };
        const { skip, limit } = pagination(req);
        const { sort, order } = ordernation(req);
        const segmentation = await getSegmentation();

        if (segmentation.value?.rule?.issuer) {
            const expectedField = segmentation.value.rule.issuer;
            const user = await getUserByToken(req);
            const userField = user[expectedField]?.toLowerCase();

            const isAnException = isSegmentationException(user, segmentation.value)
            if (userField && !isAnException) {
                queryParams.owner = userField;
            }
        }

        if (status) queryParams.status = status.toUpperCase();
        if (type) queryParams.type = type.toUpperCase();
        if (reports) queryParams.reports = reports.toUpperCase();

        try {
            const uri = `posts/admin`;
            const data = await socialApi.get(uri, { params: queryParams });

            let populatedData = await populateUserFields('user', 'userId', data);

            if (searchBy) {
                populatedData = populatedData.filter((populatedPost) => {
                    const userName = populatedPost.user.name.toLowerCase();
                    const post = populatedPost.post.toLowerCase();
                    const _searchBy = searchBy.toLowerCase();

                    return userName.includes(_searchBy) || post.includes(_searchBy);
                });
            }

            if (orderBy) {
                const field = orderBy === 'username' ? 'user.name' : orderBy
                populatedData = sortByField(populatedData, field, direction);
            }

            const response = {
                data: populatedData.slice(skip, skip + limit),
                total: populatedData.length,
            };

            return _messages.success(res, req, response);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'getFeed'
            );
        }
    },

    async findMyPosts(req, res) {
        try {
            const uri = 'posts/me';
            const { data } = await socialApi.get(uri, { params: req.query });

            const PopulatedData = await populateUserFields('user', 'userId', data);
            const response = { data: PopulatedData, total: data.total };

            return _messages.success(res, req, response);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'findMyPosts'
            );
        }
    },

    async findUserPosts(req, res) {
        try {
            const { userId } = req.params;
            const uri = `posts/user/${userId}`;
            const { data } = await socialApi.get(uri, { params: req.query });

            const PopulatedData = await populateUserFields('user', 'userId', data);
            const response = { data: PopulatedData, total: data.total };

            return _messages.success(res, req, response);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'findUserPosts'
            );
        }
    },
    async findPostById(req, res) {
        try {
            const { postId } = req.params;
            const uri = `posts/${postId}`;
            const { data } = await socialApi.get(uri);

            const PopulatedData = await populateUserFields('user', 'userId', data);

            const response = { data: PopulatedData };

            return _messages.success(res, req, response);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'findPostById'
            );
        }
    },

    async comment(req, res) {
        const isMentioningSomeone = req.body?.mentions;
        const isReplyingPost = req.body?.postId;

        try {
            const { name, _id, networkLogin } = await getUserByToken(req);

            const uri = 'posts/comments';
            const { data } = await socialApi.put(uri, req.body);
            const PopulatedData = await populateSingleData('user', 'userId', data.data);
            const response = { data: PopulatedData, total: data.total };
            const { userId: postOwnerId } = await socialApi.get(`posts/${req.body.postId}`);
            const isReplyingOwnPost = _id === postOwnerId;

            if (isMentioningSomeone) {
                const mentionedUsers = isMentioningSomeone.filter((user) => user !== postOwnerId);

                const config = {
                    reqUser: name,
                    communication: ['notification'],
                    type: 'mention',
                    contentType: 'comentário',
                    contentId: PopulatedData?._id,
                };
                await createNotification(config, mentionedUsers);
            }

            if (isReplyingPost && !isReplyingOwnPost) {
                const config = {
                    reqUser: name,
                    communication: ['notification'],
                    type: 'comment',
                    contentType: isReplyingPost ? 'post' : 'comentário',
                };
                await createNotification(config, postOwnerId);
            }

            if(!isReplyingOwnPost) {
                await GamificationKafka.publishEventRuleValidation({
                    events: [EVENT_CATEGORY.FEED_COMMENT, EVENT_CATEGORY.FEED_COMMENT_OWNER],
                    identifier: networkLogin,
                    meta: {
                        postId: req.body.postId,
                        comment: req.body.comment
                    }
                })
            }

            return _messages.success(res, req, response);
        } catch (error) {
            console.log({ error: error.message });
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'comment'
            );
        }
    },
    async loadMoreComments(req, res) {
        const { postId } = req.params;
        try {
            const uri = `posts/${postId}/comments`;
            const { data } = await socialApi.get(uri, { params: req.query });

            const PopulatedData = await populateUserFields('user', 'userId', data);
            const response = { data: PopulatedData, total: data.total };

            return _messages.success(res, req, response);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'comment'
            );
        }
    },

    async like(req, res) {
        try {
            const uri = 'posts/likes';
            const { data } = await socialApi.put(uri, req.body);

            if (req?.body?.target && req?.body?.postId) {
                const user = await getUserByToken(req)

                await GamificationKafka.publishEventRuleValidation({
                    events: [EVENT_CATEGORY.FEED_LIKE, EVENT_CATEGORY.FEED_LIKE_OWNER],
                    identifier: user.networkLogin,
                    meta: {
                        postId: req.body.postId
                    }
                })
            }

            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'like'
            );
        }
    },

    async share(req, res) {
        const users = req.body?.users;

        try {
            const { _id, networkLogin, name } = await getUserByToken(req);

            req.body.sharedBy = {
                userId: _id,
                userName: networkLogin
            }

            const uri = 'posts/shares';
            const { data } = await socialApi.post(uri, req.body);

            if (users) {
                const config = {
                    reqUser: name,
                    communication: ['notification'],
                    type: 'share',
                    contentType: 'post',
                    contentId: data.postId,
                };
                await createNotification(config, users);

                await GamificationKafka.publishEventRuleValidation({
                    events: [EVENT_CATEGORY.FEED_SHARE, EVENT_CATEGORY.FEED_SHARE_OWNER],
                    identifier: networkLogin,
                    meta: {
                        postId: req.body.postId,
                        usersWhoShared: users
                    }
                })
            }

            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'share'
            );
        }
    },

    async updatePost(req, res) {
        const body = JSON.parse(req.fields.payload) ?? null;
        try {
            const { postId } = req.params;
            const uri = `posts/${postId}`;

            const { data: oldData } = await socialApi.get(uri)
            const { data: newData } = await socialApi.put(uri, body);

            if (!newData) {
                return _messages.internalServer(
                    res,
                    req,
                    error.message,
                    'Houve um erro ao atualizar a publicação',
                    'feed',
                    'updatePost'
                );
            }

            if (Object.keys(req?.files).length > 0) {
                const uploadContent = `posts/${newData._id}/content`;

                const formData = new FormData();

                Object.keys(req?.files).forEach((key, i) => {
                    const file = req?.files[key];

                    const filename = `${i}-${file.name.replace(/ /g, '-')}`;

                    formData.append(filename, fs.createReadStream(file.path), {
                        filename,
                        contentType: file.type,
                    });
                });

                const result = await socialApi.patch(uploadContent, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        ...formData.getHeaders(),
                    },
                });

                if (result?.data && newData?.post) {
                    newData.post.content = result.data;
                }
            }

            if (oldData?.status !== 'ACTIVE' && body?.status === 'ACTIVE') {
                await handleUserPostNotification(newData)
            }

            return _messages.success(res, req, newData);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'updatePost'
            );
        }
    },

    async delete(req, res) {
        try {
            const { postId } = req.params;
            const uri = `posts/${postId}`;
            const { data } = await socialApi.delete(uri);

            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'delete'
            );
        }
    },

    async incrementViews (req, res) {
        try {
            const { postId } = req.params;
            const uri = `posts/${postId}/views`;

            await socialApi.patch(uri);

            return _messages.successEmpty(res, req);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed/posts',
                'incrementViews'
            );
        }
    }
};

async function createMessagesFromBackend(body) {
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
