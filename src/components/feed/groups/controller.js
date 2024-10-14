const axios = require('axios');
const _messages = require('../../../utils/messages');

const GroupController = {
    async getAllGroups(req, res) {
        const { status } = req.query;
        const headers = { Authorization: req.headers.authorization };
        try {
            const query = status ? `?status=${status.toUpperCase()}` : '';
            const uri = `${process.env.API_SOCIAL}/groups${query}`;
            const { data } = await axios.get(uri, { headers });
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
            const uri = `${process.env.API_SOCIAL}/groups/user/${userId}`;
            const { data } = await axios.get(uri, { headers });
            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'getGroupsManagedByUser'
            );
        }
    },
    async getGroupById(req, res) {
        const { groupId } = req.params;
        const headers = { Authorization: req.headers.authorization };
        try {
            const uri = `${process.env.API_SOCIAL}/groups/info/${groupId}`;
            const { data } = await axios.get(uri, { headers });
            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'getGroupMembers'
            );
        }
    },
    async createGroup(req, res) {
        const groupBody = req.body;
        const headers = { Authorization: req.headers.authorization };
        try {
            const uri = `${process.env.API_SOCIAL}/groups/`;
            const { data } = await axios.post(uri, groupBody, { headers });
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
            const uri = `${process.env.API_SOCIAL}/groups/${groupId}`;
            const { data } = await axios.put(uri, groupBody, { headers });
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
            const uri = `${process.env.API_SOCIAL}/groups/${groupId}/${userId}`;
            const { data } = await axios.delete(uri, { headers });
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
            const uri = `${process.env.API_SOCIAL}/groups/${groupId}`;
            const { data } = await axios.delete(uri, { headers });
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
