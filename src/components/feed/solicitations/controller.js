const _messages = require('../../../utils/messages');
const GamificationKafka = require('../../gamification/kafka/broker');
const { EVENT_CATEGORY } = require('../../gamification/model');
const { socialApi } = require('../../social/http-adapter');
const { populateUserFields } = require('../business');

module.exports = {
    async createSolicitation(req, res) {
        const solicitationBody = req.body;
        try {
            const uri = `solicitations`;
            const { data } = await socialApi.post(uri, solicitationBody);
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
            const uri = `solicitations/user/accept/${solicitationId}`;
            const { data } = await socialApi.post(uri);

            if (data?.solicitation?.status === 'ACCEPTED') {
                await GamificationKafka.publishEventRuleValidation({
                    events: [EVENT_CATEGORY.FEED_GROUP_JOIN, EVENT_CATEGORY.FEED_GROUP_PARTICIPANT],
                    identifier: data?.solicitation?.userId,
                    meta: {
                        groupId: data?.solicitation?.groupId
                    }
                })
            }

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
            const uri = `solicitations/user/decline/${solicitationId}`;
            const { data } = await socialApi.post(uri);
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
        // console.log(groupId)
        try {
            const uri = `/solicitations/group/accept/${groupId}`;
            const { data } = await socialApi.post(uri);
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
            const uri = `solicitations/group/decline/${groupId}`;
            const { data } = await socialApi.post(uri);
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
            const uri = `solicitations/groups/${groupId}`;
            const { data } = await socialApi.get(uri);
            const PopulatedData = await populateUserFields('user', 'userId', data);
            
            return _messages.success(res, req, PopulatedData);
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
    async getUserSolicitations(req, res) {
        try {
            const uri = `solicitations/user`;
            const { data } = await socialApi.get(uri);
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
