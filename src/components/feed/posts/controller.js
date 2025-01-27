const { getUserByToken } = require('../../../utils/functions');
const _messages = require('../../../utils/messages');
const { socialApi } = require('../../social/http-adapter');
const { populateUserFields, createNotification, getSegFieldsFromUser } = require('../buisiness');
const {
    sendMessageToKafka,
    processTargetUsers,
    sendCustomMessageToKafka,
} = require('../../new-messages/business');
const fs = require('fs');
const mime = require('mime-types');
const config = require('../../../../config.json');
const FormData = require('form-data');
const { getSegmentation } = require('../../config/business');
const { randomUUID } = require('crypto');

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
                const userField = user[expectedField];
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

                Object.keys(req?.files).forEach((key) => {
                    const file = req?.files[key];
                    const filename = `${file.name}-${randomUUID()}.${mime.extension(file.type)}`;
                    formData.append(key, fs.createReadStream(file.path), {
                        filename: filename,
                        contentType: file.type,
                    });
                });

                socialApi.patch(uploadContent, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        ...formData.getHeaders(),
                    },
                });
            }

            if (body.notifyUsers === true && (body?.elegibilities || body?.elegibilitiesAnd)) {
                const { _id, name } = await getUserByToken(req);
                const title = 'Novo post publicado pela administração!';
                const texthtml = '<br> <p>Olá! A administração publicou um novo post!</p> <br>';
                const text = `${name}: ${body.title}`;

                const messageList = {
                    user: true,
                    trail: false,
                    listName: title,
                    client: process.env.CLIENT_ID,
                    userId: _id,
                    elegibilities: body?.elegibilities,
                    elegibilitiesAnd: body?.elegibilitiesAnd,
                    sendToKafka: {
                        category: 'notify',
                        type: ['notification'],
                        title: title,
                        text: text,
                        texthtml: texthtml,
                        thumbnail: config.messenger.emailTemplate.thumbnail,
                        notificationlink: {
                            url: 'https://v2.staging.happlearning.com.br/login/entrar?redirectTo=/home',
                            trailid: '',
                            item: '',
                        },
                    },
                };

                sendCustomMessageToKafka(messageList, process.env.TOPIC_MSG_LIST);
            }

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
        const { status, type, reports } = req.query;
        const queryParams = new URLSearchParams();

        const segmentation = await getSegmentation();

        if (segmentation.value?.rule?.issuer) {
            const expectedField = segmentation.value.rule.issuer;
            const user = await getUserByToken(req);
            const userField = user[expectedField];
            if (userField) {
                queryParams.append('owner', userField);
            }
        }

        if (status) queryParams.append('status', status.toUpperCase());
        if (type) queryParams.append('type', type.toUpperCase());
        if (reports) queryParams.append('reports', reports.toUpperCase());

        const searchQuery = queryParams.toString();
        try {
            const query = `?${searchQuery}`;
            const uri = `posts/admin${query}`;
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
            const { name, _id } = await getUserByToken(req);

            const uri = 'posts/comments';
            const { data } = await socialApi.put(uri, req.body);
            const PopulatedData = await populateUserFields('user', 'userId', data.data);
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
                    contentId: PopulatedData._id,
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
            const { data } = await socialApi.put(uri, body);

            return _messages.success(res, req, data);
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
