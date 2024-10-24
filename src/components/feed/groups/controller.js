const _messages = require('../../../utils/messages');
const { socialApi } = require('../../social/http-adapter');
const { populateUserFields } = require('../buisiness');

const GroupController = {
    async getAllGroups(req, res) {
        const { status } = req.query;

        try {
            const query = status ? `?status=${status.toUpperCase()}` : '';
            const uri = `groups${query}`;
            const { data } = await socialApi.get(uri, { params: req.query });

            const PopulatedData = await populateUserFields('owner', 'ownerId', data);
            const response = { data: PopulatedData.data, total: data.total };

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
    async getAvaliableGroups(req, res) {
        try {
            const uri = `groups/avaliable`;
            const { data } = await socialApi.get(uri);

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
        try {
            const uri = `/groups/user/${userId}`;
            const { data } = await socialApi.get(uri);

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
        const { requests } = req.query;

        try {
            const query = requests ? `?requests=${requests.toLowerCase()}` : '';
            const uri = `/groups/info/${groupId}${query}`;
            const { data } = await socialApi.get(uri);

            const [populatedOwner, populatedRequests] = await Promise.all([
                await populateUserFields('owner', 'ownerId', data),
                await populateUserFields('user', 'userId', data.requests),
            ]);
            
            const response = { data: { ...populatedOwner, requests: populatedRequests } };

            return _messages.success(res, req, response);
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
        const body = JSON.parse(req.fields.payload) ?? null;
        try {
            const uri = `/groups/`;
            const { data } = await socialApi.post(uri, body);
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
        const body = JSON.parse(req.fields.payload) ?? null;
        const { groupId } = req.params;

        try {
            const uri = `/groups/${groupId}`;
            const { data } = await socialApi.put(uri, body);
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
            const uri = `/groups/${groupId}/${userId}`;
            const { data } = await socialApi.delete(uri);
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
            const uri = `/groups/${groupId}`;
            const { data } = await socialApi.delete(uri);
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
