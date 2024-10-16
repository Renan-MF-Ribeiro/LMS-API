const _messages = require('../../../utils/messages');
const { socialApi } = require('../../social/http-adapter');

module.exports = {
    async create(req, res) {
        const headers = { Authorization: req.headers.authorization };
        try {
            const uri = 'posts';
            const { data } = await socialApi.post(uri, req.body, { headers });

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

    async findAllByGroup(req, res) {
        const headers = { Authorization: req.headers.authorization };
        try {
            const { groupId } = req.params;
            const uri = `posts/groups/${groupId}`;
            const { data } = await socialApi.get(uri, { headers });

            return _messages.success(res, req, data);
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
        const headers = { Authorization: req.headers.authorization };
        try {
            const uri = 'posts/public';
            const { data } = await socialApi.get(uri, { headers });

            return _messages.success(res, req, data);
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
        const headers = { Authorization: req.headers.authorization };
        try {
            const uri = 'posts/feed';
            const { data } = await socialApi.get(uri, { headers });

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

    async findMyPosts(req, res) {
        const headers = { Authorization: req.headers.authorization };
        try {
            const uri = 'posts/me';
            const { data } = await socialApi.get(uri, { headers });

            return _messages.success(res, req, data);
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
        const headers = { Authorization: req.headers.authorization };
        try {
            const { userId } = req.params;
            const uri = `posts/${userId}`;
            const { data } = await socialApi.get(uri, { headers });

            return _messages.success(res, req, data);
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

    async comment(req, res) {
        const headers = { Authorization: req.headers.authorization };
        try {
            const uri = 'posts/comments';
            const { data } = await socialApi.put(uri, req.body, { headers });

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

    async like(req, res) {
        const headers = { Authorization: req.headers.authorization };
        try {
            const uri = 'posts/likes';
            const { data } = await socialApi.put(uri, req.body, { headers });

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
        const headers = { Authorization: req.headers.authorization };
        try {
            const uri = 'posts/shares';
            const { data } = await socialApi.post(uri, req.body, { headers });

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
        const headers = { Authorization: req.headers.authorization };
        try {
            const { postId } = req.params;
            const uri = `posts/${postId}`;
            const { data } = await socialApi.delete(uri, { headers });

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
