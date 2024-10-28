const { getUserByToken } = require('../../../utils/functions');
const _messages = require('../../../utils/messages');
const { socialApi } = require('../../social/http-adapter');
const { populateUserFields, populateTrailFields } = require('../buisiness');

module.exports = {
    async create(req, res) {
        const body = JSON.parse(req.fields.payload) ?? null;
        try {
            const uri = 'posts';
            const { data } = await socialApi.post(uri, body);

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
            const { myPosts, groupId } = req.params;

            if (groupId) {
                const uri = `posts/groups/${groupId}`;
                const { data } = await socialApi.get(uri);

                if (myPosts) {
                    const { _id } = await getUserByToken(req);
                    data.data = data.data.filter((post) => _id.equals(post.userId));
                }

                const PopulatedData = await populateUserFields('user', 'userId', data);
                const postsWithComments = await Promise.all(
                    PopulatedData.map(async (post) => {
                        post.reactions.comments = await populateUserFields(
                            'user',
                            'userId',
                            post.reactions.comments
                        );
                        return post;
                    })
                );
                const response = { data: postsWithComments, total: data.total };

                return _messages.success(res, req, response);
            } else {
                const uri = !myPosts ? 'posts/public' : 'posts/me';
                const { data } = await socialApi.get(uri);

                const PopulatedData = await populateUserFields('user', 'userId', data);
                const postsWithComments = await Promise.all(
                    PopulatedData.map(async (post) => {
                        post.reactions.comments = await populateUserFields(
                            'user',
                            'userId',
                            post.reactions.comments
                        );
                        return post;
                    })
                );
                const response = { data: postsWithComments, total: data.total };

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

            // TODO: otimizar todos os populates
            // Atualmente a função nao popula nested object items, sendo necessário chama-la duas vezes. Um para as reactions e outra para o post
            const PopulatedData = await populateUserFields('user', 'userId', data);
            const postsWithComments = await Promise.all(
                PopulatedData.map(async (post) => {
                    post.reactions.comments = await populateUserFields(
                        'user',
                        'userId',
                        post.reactions.comments
                    );
                    return post;
                })
            );
            const response = { data: postsWithComments, total: data.total };

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
            const postsWithComments = await Promise.all(
                PopulatedData.map(async (post) => {
                    post.reactions.comments = await populateUserFields(
                        'user',
                        'userId',
                        post.reactions.comments
                    );
                    return post;
                })
            );
            const response = { data: postsWithComments, total: data.total };

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
    async listCompanyPosts(req, res) {
        try {
            const uri = 'posts/company';
            const { data } = await socialApi.get(uri, { params: req.query });

            const PopulatedData = await populateUserFields('user', 'userId', data);
            const postsWithComments = await Promise.all(
                PopulatedData.map(async (post) => {
                    post.reactions.comments = await populateUserFields(
                        'user',
                        'userId',
                        post.reactions.comments
                    );
                    return post;
                })
            );
            const response = { data: postsWithComments, total: data.total };

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
            const postsWithComments = await Promise.all(
                PopulatedData.map(async (post) => {
                    post.reactions.comments = await populateUserFields(
                        'user',
                        'userId',
                        post.reactions.comments
                    );
                    return post;
                })
            );
            const response = { data: postsWithComments, total: data.total };
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
            const postsWithComments = await Promise.all(
                PopulatedData.map(async (post) => {
                    post.reactions.comments = await populateUserFields(
                        'user',
                        'userId',
                        post.reactions.comments
                    );
                    return post;
                })
            );
            const response = { data: postsWithComments, total: data.total };

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
            const comments = await populateUserFields('user', 'userId', data.reactions.comments);
            const trails = await populateTrailFields(PopulatedData.trails);

            const returningObject = {
                ...PopulatedData,
                reactions: { ...PopulatedData.reactions, comments },
                trails,
            };

            const response = { data: returningObject };

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
            const uri = 'posts/comments';
            const { data } = await socialApi.put(uri, req.body);

            return _messages.success(res, req, data);
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
    async loadMoreComments(req, res) {
        const { postId } = req.params;
        try {
            const uri = `posts/${postId}/comments`;
            const { data } = await socialApi.get(uri, { params: req.query });

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
            const uri = 'posts/shares';
            const { data } = await socialApi.post(uri, req.body);

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
