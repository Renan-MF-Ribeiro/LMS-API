const _messages = require('../../utils/messages');
const { socialApi } = require('../social/http-adapter');

module.exports = {
    async getAllGroups(req, res) {
        try {
            const uri = 'groups';
            const response = await socialApi.get(uri);

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
        try {
            const uri = 'groups/managed';
            const response = await socialApi.get(uri);
            
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
            const uri = `groups/managed/${userId}`;
            const response = await socialApi.get(uri);

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
        const { groupId } = req.params;
        try {
            const uri = `groups/members/${groupId}`;
            const response = await socialApi.put(uri);

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
            const uri = 'solicitation';
            const response = await socialApi.post(uri, solicitationBody);
            
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
            const uri = `solicitation/accept/${solicitationId}`;
            const response = await socialApi.post(uri);

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
            const uri = `solicitation/decline/${solicitationId}`;
            const response = await socialApi.post(uri);

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
            const uri = `solicitation/${groupId}`;
            const response = await socialApi.get(uri);

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
        const { groupId } = req.params;
        try {
            const uri = `groups/members/${groupId}`;
            const response = await socialApi.get(uri);

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
        const { groupId } = req.params;
        try {
            const uri = `groups/members/${groupId}`;
            const response = await socialApi.get(uri);
            
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
