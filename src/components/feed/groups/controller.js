const _messages = require('../../../utils/messages');
const { socialApi } = require('../../social/http-adapter');
const { User } = require('../../users/model');

const GroupController = {
    async getAllGroups(req, res) {
        const { status } = req.query;
        try {
            const query = status ? `?status=${status.toUpperCase()}` : '';
            const uri = `groups${query}`;
            const { data } = await socialApi.get(uri);

            const ids = [...new Set(data.data.map((x) => x.ownerId))];
            const users = await User.find({ _id: { $in: ids } }, '_id name profilePhoto').lean();

            const userMap = Object.fromEntries(users.map((user) => [user._id.toString(), user]));

            const populatedData = data.data.map((group) => ({
                data: {
                    ...group,
                    owner: userMap[group.ownerId],
                },
            }));
            return _messages.success(res, req, populatedData);
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
        try {
            const uri = `/groups/info/${groupId}`;
            const { data } = await socialApi.get(uri);
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
        try {
            const uri = `/groups/`;
            const { data } = await socialApi.post(uri, groupBody);
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
            const uri = `/groups/${groupId}`;
            const { data } = await socialApi.put(uri, groupBody);
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
