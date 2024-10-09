const axios = require('axios');
const _messages = require('../../../utils/messages');

module.exports = {
    async getAllGroups(req, res) {
        const { status } = req.query;
        try {
            const query = status ? `?status=${status.toUpperCase()}` : ""
            const uri = `${process.env.API_SOCIAL}/group/${process.env.CLIENT_ID}${query}`;
            const { data } = await axios.get(uri);
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
    async getGroupsManagedByUser(req, res) {
        const { userId } = req.params;
        try {
            const uri = `${process.env.API_SOCIAL}/group/managed/${userId}`;
            const { data } = await axios.get(uri);
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
    async findGroupsUserIsAMember(req, res) {
        const { userId } = req.params;
        try {
            const uri = `${process.env.API_SOCIAL}/group/ismember/${userId}`;
            const { data } = await axios.get(uri);
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
        try {
            const uri = `${process.env.API_SOCIAL}/group/info/${groupId}`;
            const { data } = await axios.get(uri);
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
    async addMemberToGroups(req, res) {
        const { groupId, userId } = req.params;
        try {
            const uri = `${process.env.API_SOCIAL}/group/members/${groupId}/${userId}`;
            const { data } = await axios.post(uri);
            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'addMemberToGroups'
            );
        }
    },
    async createGroup(req, res) {
        const groupBody = req.body;
        try {
            const uri = `${process.env.API_SOCIAL}/group/`;
            const { data } = await axios.post(uri, groupBody);
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

        try {
            const uri = `${process.env.API_SOCIAL}/group/${groupId}`;
            const { data } = await axios.put(uri, groupBody);
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
        try {
            const uri = `${process.env.API_SOCIAL}/group/${groupId}/${userId}`;
            const { data } = await axios.delete(uri);
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
        try {
            const uri = `${process.env.API_SOCIAL}/group/${groupId}`;
            const { data } = await axios.delete(uri);
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
