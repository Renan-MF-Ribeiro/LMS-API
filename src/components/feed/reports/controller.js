const _messages = require('../../../utils/messages');
const { socialApi } = require('../../social/http-adapter');

module.exports = {
    listPostReports: async (req, res) => {
        try {
            const uri = 'reports/posts';
            const { data } = await socialApi.get(uri, { params: req?.query });

            return _messages.success(res, req, data, 'ok', 'feed', 'reports/posts');
        } catch (error) {
            _messages.badRequest(res, req, error.message, error.message, 'feed', 'reports/posts');
        }
    },

    findRelatedReports: async (req, res) => {
        try {
            const { postId } = req.params;
            const uri = `reports/posts/${postId}/users`;
            const { data } = await socialApi.get(uri);

            return _messages.success(res, req, data, 'ok', 'feed', 'reports/posts/:postId/users');
        } catch (error) {
            _messages.badRequest(
                res,
                req,
                error.message,
                error.message,
                'feed',
                'reports/posts/:postId/users'
            );
        }
    },

    getPostReport: async (req, res) => {
        try {
            const { reportId } = req.params;
            const uri = `reports/posts/${reportId}`;
            const { data } = await socialApi.get(uri);

            return _messages.success(res, req, data, 'ok', 'feed', 'reports/posts');
        } catch (error) {
            _messages.badRequest(
                res,
                req,
                error.message,
                error.message,
                'feed',
                'reports/posts/:reportId'
            );
        }
    },

    createPostReport: async (req, res) => {
        try {
            const uri = 'reports/posts';
            const { data } = await socialApi.post(uri, req.body);

            return _messages.success(res, req, data, 'ok', 'feed', 'reports/posts');
        } catch (error) {
            _messages.badRequest(res, req, error.message, error.message, 'feed', 'reports/posts');
        }
    },

    removePostReports: async (req, res) => {
        try {
            const { postId } = req.params;
            const uri = `reports/posts/${postId}`;
            await socialApi.delete(uri);

            return _messages.successEmpty(res, req, 'ok', 'feed', 'reports/posts/:postId');
        } catch (error) {
            _messages.badRequest(
                res,
                req,
                error.message,
                error.message,
                'feed',
                'reports/posts/:postId'
            );
        }
    },
};
