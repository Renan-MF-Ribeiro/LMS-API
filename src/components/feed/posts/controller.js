const { getUserByToken } = require('../../../utils/functions');
const _messages = require('../../../utils/messages');
const { socialApi } = require('../../social/http-adapter');
const { populateUserFields, populateTrailFields } = require('../buisiness');
const FormData = require('form-data');
const fs = require('fs');
const mime = require('mime-types');
const { sendMessageToKafka, processTargetUsers } = require('../../new-messages/business');

const config = require('../../../../config.json');
const { Group } = require('../../groups/model');
const { User } = require('../../users/model');

module.exports = {
    async create(req, res) {
        const body = JSON.parse(req.fields.payload) ?? null;

        try {
            delete body.banner;
            const uri = 'posts';
            const { data } = await socialApi.post(uri, body);

            if (Object.keys(req?.files).length > 0) {
                const uploadContent = `posts/${data.post._id}/content`;

                const formData = new FormData();
                const key = Object.keys(req.files)[0];
                const file = req.files[key];
                const filename = `${file.naem}.${mime.extension(file.type)}`;
                formData.append('content', fs.createReadStream(file.path), filename);

                socialApi.patch(uploadContent, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        ...formData.getHeaders(),
                    },
                });
            }

            if (body?.type === 'ADMIN' && (body?.elegibilities || body?.elegibilitiesAnd)) {
                const tags = [];
                const elegibilities = body?.elegibilities || [];
                const elegibilitiesAnd = body?.elegibilitiesAnd || [];
                const mergedElegibilities = [...elegibilities, ...elegibilitiesAnd];

                const groups = await Group.find({ 'tags.value': { $in: mergedElegibilities } });
                const users = await User.find({ groupsAD: { $in: groups.map((g) => g.name) } });

                const userTags = groups.filter((group) => elegibilities.includes(group.name));
                const userTagsAnd = groups.filter((group) => elegibilitiesAnd.includes(group.name));

                const elegibleUsers = users.filter((user) => {
                    const hasTags = userTags.some((tag) => user.groupsAD.includes(tag));
                    const hasTagsAnd = userTagsAnd.every((tag) => user.groupsAD.includes(tag));

                    return hasTags || hasTagsAnd;
                });

                const usersIds = elegibleUsers.map((elegibleUser) => elegibleUser._id);
                for (let id of usersIds) {
                    const text = 'Olá! A administração publicou um novo post!';
                    const texthtml = '<br> <p>Olá! A administração publicou um novo post!</p> <br>';
                    const message = {
                        category: 'notify',
                        communication: ['notification'],
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
                        title: 'Novo post publicado pela administração',
                    };
                    createMessagesFromBackend(message);
                }

                tags.push(...groups.map((group) => group.name));
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
        const { status, type } = req.query;
        const queryParams = new URLSearchParams();

        if (status) queryParams.append('status', status.toUpperCase());
        if (type) queryParams.append('type', type.toUpperCase());

        const searchQuery = queryParams.toString();
        try {
            const query = status ? `?${searchQuery}` : '';
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
        try {
            const { name } = await getUserByToken(req);

            const uri = 'posts/comments';
            const { data } = await socialApi.put(uri, req.body);
            const PopulatedData = await populateUserFields('user', 'userId', data.data);
            const response = { data: PopulatedData, total: data.total };

            const mentions = req?.body?.mentions || [];
            for (let id of mentions) {
                const text = `Olá! O usuário ${name} mencionou você em um post!`;
                const texthtml = `<br> <p>Olá! O usuário ${name} mencionou você em um post!</p> <br>`;
                const message = {
                    category: 'notify',
                    communication: ['notification'],
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
                    title: `Happlearning - ${name} mencionou você em um post!`,
                };
                createMessagesFromBackend(message);
            }

            return _messages.success(res, req, response);
        } catch (error) {
            console.log({ error });
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
        try {
            const { name } = await getUserByToken(req);

            const uri = 'posts/shares';
            const { data } = await socialApi.post(uri, req.body);

            const users = req?.body?.users || [];
            for (let id of users) {
                const text = `Olá! O usuário ${name} compartilhou um post com você!`;
                const texthtml = `<br> <p>Olá! O usuário ${name} compartilhou um post com você!</p> <br>`;
                const message = {
                    category: 'notify',
                    communication: ['notification'],
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
                    title: `Happlearning - ${name} compartilhou um post com você!`,
                };
                createMessagesFromBackend(message);
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
