const axios = require('axios');
const _messages = require('../../../utils/messages');

module.exports = {
    async createSolicitation(req, res) {
        const solicitationBody = req.body;
        try {
            const uri = `${process.env.API_SOCIAL}/solicitation`;
            const { data } = await axios.post(uri, solicitationBody);
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
    async acceptSolicitation(req, res) {
        const { solicitationId } = req.params;
        try {
            const uri = `${process.env.API_SOCIAL}/solicitation/accept/${solicitationId}`;
            const { data } = await axios.post(uri);
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
    async declineSolicitation(req, res) {
        const { solicitationId } = req.params;
        try {
            const uri = `${process.env.API_SOCIAL}/solicitation/decline/${solicitationId}`;
            const { data } = await axios.post(uri);
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
            const uri = `${process.env.API_SOCIAL}/solicitation/${groupId}`;
            const { data } = await axios.get(uri);
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
