const axios = require('axios');
const _messages = require('../../../utils/messages');
const { socialApi } = require('../../social/http-adapter');

const GroupController = {
    async getAllGroups(req, res) {
        const { status } = req.query;
        const headers = { Authorization: req.headers.authorization };
        try {
            const query = status ? `?status=${status.toUpperCase()}` : '';
            const uri = `groups${query}`;
            const { data } = await socialApi.get(uri, { headers });
            return _messages.success(res, req, data);
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
    async findUsersGroup(req, res) {
        const { userId } = req.params;
        const headers = { Authorization: req.headers.authorization };
        try {
            const uri = `/groups/user/${userId}`;
            const { data } = await socialApi.get(uri, { headers });
            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'findUsersGroup'
            );
        }
    },
    async getGroupById(req, res) {
        const { groupId } = req.params;
        const headers = { Authorization: req.headers.authorization };
        try {
            const uri = `/groups/info/${groupId}`;
            const { data } = await socialApi.get(uri, { headers });
            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'getGroupById'
            );
        }
    },
    async createGroup(req, res) {
        const groupBody = req.body;
        const headers = { Authorization: req.headers.authorization };
        try {
            const uri = `/groups/`;
            const { data } = await socialApi.get(uri, groupBody, { headers });
            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'createGroup'
            );
        }
    },
    async updateGroup(req, res) {
        const groupBody = req.body;
        const { groupId } = req.params;
        const headers = { Authorization: req.headers.authorization };

        try {
            const uri = `/groups/${groupId}`;
            const { data } = await socialApi.put(uri, groupBody, { headers });
            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'updateGroup'
            );
        }
    },
    async deleteUserFromGroup(req, res) {
        const { groupId, userId } = req.params;
        const headers = { Authorization: req.headers.authorization };

        try {
            const uri = `/groups/${groupId}/${userId}`;
            const { data } = await socialApi.delete(uri, { headers });
            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'deleteUserFromGroup'
            );
        }
    },
    async deleteGroup(req, res) {
        const { groupId } = req.params;
        const headers = { Authorization: req.headers.authorization };

        try {
            const uri = `/groups/${groupId}`;
            const { data } = await socialApi.delete(uri, { headers });
            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'deleteUserFromGroup'
            );
        }
    },
};

module.exports = GroupController;
