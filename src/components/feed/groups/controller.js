const { getElegibleUsers } = require('../../../utils/functions');
const _messages = require('../../../utils/messages');
const { socialApi } = require('../../social/http-adapter');
const { populateUserFields, populateMembers, getSegFieldsFromUser } = require('../buisiness');
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
            const { data } = await socialApi.get(uri, { params: req.query });
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
            console.log(error);
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
        const userCustomElegeFields = await getSegFieldsFromUser(req);

        body.userCustomElegeFields = userCustomElegeFields;

        if (body.auto === true) {
            const elegibleUsers = await getElegibleUsers(
                body?.elegibilities,
                body?.elegibilitiesAnd
            );
            const newUsers = elegibleUsers.map((user) => user._id);
            body.members = [...newUsers, ...body.members];
        }

        try {
            delete body.banner;
            const uri = 'groups';
            const { data } = await socialApi.post(uri, body);

            if (req?.files && Object.keys(req?.files)?.length > 0) {
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
            delete body.banner;
            const uri = `/groups/${groupId}`;
            const { data } = await socialApi.put(uri, body);

            if (body.auto === true) {
                const elegibleUsers = await getElegibleUsers(
                    body?.elegibilities,
                    body?.elegibilitiesAnd
                );
                const newUsers = elegibleUsers.map((user) => user._id);
                body.members = [newUsers, ...body.members];
            }

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
    async updateElegibleMembers(req, res) {
        const body = req.body;
        const { groupId } = req.params;
        const uri = `/groups/members/${groupId}`;

        try {
            const members = await getElegibleUsers(body?.elegibilities, body?.elegibilitiesAnd);
            const memberIds = members.map((user) => user._id);

            const { data } = await socialApi.patch(uri, memberIds);

            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'feed',
                'updateElegibleMembers'
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
