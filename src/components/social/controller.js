const axios = require('axios');
const { CLIENT_ID, API_SOCIAL } = process.env;
const _messages = require('../../utils/messages');

module.exports = {
    async createComment(req, res) {
        try {
            const uri = `${API_SOCIAL}/comment/${CLIENT_ID}`;
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
            const uri = `${API_SOCIAL}/comment/${CLIENT_ID}`;
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
            const uri = `${API_SOCIAL}/like/${CLIENT_ID}`;
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
            const uri = `${API_SOCIAL}/like/${trailId}`;
            const { data } = await axios.get(uri);

            return _messages.success(req, res, data)
        } catch (error) {
            console.log(error)
            return _messages.badRequest(error)
        }
    },
    async deleteLike(req, res) {
        try {
            const uri = `${API_SOCIAL}/like`;
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
            const uri = `${API_SOCIAL}/favorite/${CLIENT_ID}`;
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
            const uri = `${API_SOCIAL}/favorite/${userId}`;
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
            const uri = `${API_SOCIAL}/favorite/${favoriteId}`;
            const { data } = await axios.put(uri, body);

            return _messages.success(req, res, data)
        } catch (error) {
            console.log(error)
            return _messages.badRequest(error)
        }
    },

}
