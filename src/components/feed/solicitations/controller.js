const axios = require('axios');
const _messages = require('../../../utils/messages');

module.exports = {
    async createSolicitation(req, res) {
        const solicitationBody = req.body;
        try {
            const uri = `${process.env.API_SOCIAL}/solicitations`;
            const { data } = await axios.post(uri, solicitationBody);
            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'createSolicitation'
            );
        }
    },
    async acceptUserSolicitation(req, res) {
        const { solicitationId } = req.params;
        try {
            const uri = `${process.env.API_SOCIAL}/solicitations/user/accept/${solicitationId}`;
            const { data } = await axios.post(uri);
            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'acceptSolicitation'
            );
        }
    },
    async declineUserSolicitation(req, res) {
        const { solicitationId } = req.params;
        try {
            const uri = `${process.env.API_SOCIAL}/solicitations/user/decline/${solicitationId}`;
            const { data } = await axios.post(uri);
            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'declineSolicitation'
            );
        }
    },
    async acceptGroupSolicitation(req, res) {
        const { groupId } = req.params;
        console.log(groupId)
        try {
            const uri = `${process.env.API_SOCIAL}/solicitations/group/accept/${groupId}`;
            const { data } = await axios.post(uri);
            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'acceptSolicitation'
            );
        }
    },
    async declineGroupSolicitation(req, res) {
        const { groupId } = req.params;
        try {
            const uri = `${process.env.API_SOCIAL}/solicitations/group/decline/${groupId}`;
            const { data } = await axios.post(uri);
            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'declineSolicitation'
            );
        }
    },
    async getGroupSolicitations(req, res) {
        const { groupId } = req.params;
        try {
            const uri = `${process.env.API_SOCIAL}/solicitations/${groupId}`;
            const { data } = await axios.get(uri);
            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'getGroupSolicitations'
            );
        }
    },
};
