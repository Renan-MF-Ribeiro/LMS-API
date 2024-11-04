const _messages = require('../../../utils/messages');
const { socialApi } = require('../../social/http-adapter');
const { populateUserFields, populateMembers } = require('../buisiness');
const FormData = require('form-data');
const fs = require('fs');
const mime = require('mime-types');

const GroupController = {
    async getAllGroups(req, res) {
        const { status } = req.query;

        try {
            const query = status ? `?status=${status.toUpperCase()}` : '';
            const uri = `groups${query}`;
            const { data } = await socialApi.get(uri, { params: req.query });

            const PopulatedData = await populateUserFields('owner', 'ownerId', data);
            const response = { data: PopulatedData, total: data.total };

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

            const PopulatedData = await populateUserFields('owner', 'ownerId', data);
            const response = { data: PopulatedData, total: data.total };

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
        const { groupId } = req.params;
        try {
            const uri = `groups/members/${groupId}`;
            const { data } = await socialApi.get(uri);
            const PopulatedData = await populateMembers(data);
            const response = { data: PopulatedData, total: data.total };

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
    async findUsersGroup(req, res) {
        const { userId } = req.params;
        const { searchBy } = req.query;
        const query = searchBy ? `?searchBy=${searchBy}` : '';

        try {
            const uri = `/groups/user/${userId}${query}`;
            const { data } = await socialApi.get(uri);

            return _messages.success(res, req, data);
        } catch (error) {
            console.log(error)
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

            let groupRequests = undefined;
            if (requests === 'true') {
                groupRequests = await populateUserFields('user', 'userId', { data: data.requests });
            }
            const populatedOwner = await populateUserFields('owner', 'ownerId', data);

            const response = { data: { ...populatedOwner, requests: groupRequests } };

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
            delete body.banner;
            const uri = 'groups';
            const { data } = await socialApi.post(uri, body);

            if (Object.keys(req?.files).length > 0) {
                const uploadBanner = `groups/${data.group._id}/banner`;

                const formData = new FormData();
                const key = Object.keys(req.files)[0];
                const file = req.files[key];
                const filename = `${file.name}.${mime.extension(file.type)}`;

                formData.append('banner', fs.createReadStream(file.path), filename);

                socialApi.patch(uploadBanner, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        ...formData.getHeaders(),
                    },
                });
            }

            return _messages.success(res, req, {});
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
            delete body.banner;
            const uri = `/groups/${groupId}`;
            const { data } = await socialApi.put(uri, body);

            if (Object.keys(req?.files).length > 0) {
                const uploadBanner = `groups/${groupId}/banner`;

                const formData = new FormData();
                const key = Object.keys(req.files)[0];
                const file = req.files[key];
                const filename = `${file.name}.${mime.extension(file.type)}`;

                formData.append('banner', fs.createReadStream(file.path), filename);

                socialApi.patch(uploadBanner, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        ...formData.getHeaders(),
                    },
                });
            }

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
    async quitFromGroup(req, res) {
        const { groupId } = req.params;

        try {
            const uri = `/groups/quit/${groupId}`;
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
