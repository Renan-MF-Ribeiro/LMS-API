const axios = require('axios');
const _messages = require('../../utils/messages');

module.exports = {
    async getAllGroups(req, res) {
        try {
            const uri = `${process.env.API_SOCIAL}/group/${process.env.CLIENT_ID}`;
            const response = await axios.get(uri);
            return _messages.success(res, req, response);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'getAllGroups'
            );
        }
    },
    async getGroupsManagedByUser(req, res) {
        const { userId } = req.params;
        try {
            const uri = `${process.env.API_SOCIAL}/group/managed/${userId}`;
            const response = await axios.get(uri);
            return _messages.success(res, req, response);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'getAllGroups'
            );
        }
    },
    async getGroupMembers(req, res) {
        const { userId } = req.params;
        try {
            const uri = `${process.env.API_SOCIAL}/group/managed/${userId}`;
            const response = await axios.get(uri);
            return _messages.success(res, req, response);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'getAllGroups'
            );
        }
    },
    async addMemberToGroups(req, res) {
        const { groupId, userId } = req.params;
        try {
            const uri = `${process.env.API_SOCIAL}/group/members/${groupId}/${userId}`;
            const response = await axios.put(uri);
            return _messages.success(res, req, response);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'getAllGroups'
            );
        }
    },
    async createSolicitation(req, res) {
        const solicitationBody = req.body;
        try {
            const uri = `${process.env.API_SOCIAL}/solicitation`;
            const response = await axios.post(uri, solicitationBody);
            return _messages.success(res, req, response);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'getAllGroups'
            );
        }
    },
    async acceptSolicitation(req, res) {
        const { solicitationId } = req.params;
        try {
            const uri = `${process.env.API_SOCIAL}/solicitation/accept/${solicitationId}`;
            const response = await axios.post(uri);
            return _messages.success(res, req, response);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'getAllGroups'
            );
        }
    },
    async declineSolicitation(req, res) {
        const { solicitationId } = req.params;
        try {
            const uri = `${process.env.API_SOCIAL}/solicitation/decline/${solicitationId}`;
            const response = await axios.post(uri);
            return _messages.success(res, req, response);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'getAllGroups'
            );
        }
    },
    async getGroupSolicitations(req, res) {
        const { groupId } = req.params;
        try {
            const uri = `${process.env.API_SOCIAL}/solicitation//${groupId}`;
            const response = await axios.get(uri);
            return _messages.success(res, req, response);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'getAllGroups'
            );
        }
    },
    async addMemberToGroup(req, res) {
        const { groupId, userId } = req.params;
        try {
            const uri = `${process.env.API_SOCIAL}/group/members/${groupId}/${userId}`;
            const response = await axios.get(uri);
            return _messages.success(res, req, response);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'getAllGroups'
            );
        }
    },
    async addMemberToGroup(req, res) {
        const { groupId, userId } = req.params;
        try {
            const uri = `${process.env.API_SOCIAL}/group/members/${groupId}/${userId}`;
            const response = await axios.get(uri);
            return _messages.success(res, req, response);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'getAllGroups'
            );
        }
    },
};
