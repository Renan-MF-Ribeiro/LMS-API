const _messages = require('../../../utils/messages');
const { mentoringApi } = require('../http-adapter');
const { populateTrailFields, processElegibility } = require('./business');
const { populateBlockedUserFields } = require('../business');

const {
    azureBlob,
} = require('../../../utils/files');

const mentorConfigController = {
    async findByClientId(req, res) {
        try {
            const { data } = await mentoringApi.get(`/config/${process.env.CLIENT_ID}`);
            const populatedMentorTrails = await populateTrailFields(data.data.mentorRecommendations.trails);
            const populatedMenteeTrails = await populateTrailFields(data.data.menteeRecommendations.trails);
            if (data.data.blockedMentees.length > 0) {
                const populatedUsers = await populateBlockedUserFields(data.data.blockedMentees);
                data.data.blockedMentees = populatedUsers || [];
            }

            data.data.mentorRecommendations.trails = populatedMentorTrails;
            data.data.menteeRecommendations.trails = populatedMenteeTrails;


            return _messages.success(
                res,
                req,
                data.data,
                'ok',
                'mentoring',
                'find config by client id'
            );
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
                error.response?.data?.message ?? error.message,
                'mentoria',
                'findMyProfile'
            );
        }
    },

    async findIntegrationByClientId(req, res) {
        try {
            const { data } = await mentoringApi.get(`/config/integration/${process.env.CLIENT_ID}`);

            return _messages.success(
                res,
                req,
                data.data,
                'ok',
                'mentoring',
                'find config by client id'
            );
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
                error.response?.data?.message ?? error.message,
                'mentoria',
                'findMyProfile'
            );
        }
    },

    async integrationConfig(req, res) {
        const body = req.body;
        try {
            const { data } = await mentoringApi.post(`/config/integration`, body);

            return _messages.success(
                res,
                req,
                data.data,
                'ok',
                'mentoring',
                'find config by client id'
            );
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
                error.response?.data?.message ?? error.message,
                'mentoria',
                'findMyProfile'
            );
        }
    },

    async createConfig(req, res) {
        const { banner } = req.files;
        const body = JSON.parse(req.fields.payload) ?? null;
        if (banner) {
            body.banner = await azureBlob(banner, 'mentoring/banners');
        }
        try {
            const { data } = await mentoringApi.post(`/config/`, body);
            return _messages.success(
                res,
                req,
                data.data,
                'ok',
                'mentoring',
                'find config by client id'
            );
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
                error.response?.data?.message ?? error.message,
                'mentoria',
                'findMyProfile'
            );
        }
    },

    async home(req, res) {
        try {
            const { data } = (await mentoringApi.get(`/config/home`)).data;
            const populatedMentorTrails = await populateTrailFields(data.mentorRecommendations.trails);
            const populatedMenteeTrails = await populateTrailFields(data.menteeRecommendations.trails);
            data.isElegible = await processElegibility(req, data.elegibilities)
            
            data.mentorRecommendations.trails = populatedMentorTrails;
            data.menteeRecommendations.trails = populatedMenteeTrails;

            delete data.elegibilities
            return _messages.success(
                res,
                req,
                data,
                'ok',
                'mentoring',
                'find config by client id'
            );
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
                error.response?.data?.message ?? error.message,
                'mentoria',
                'findMyProfile'
            );
        }
    },

    async getBlockedUsers(req, res) {
        try {
            const { data } = (await mentoringApi.get(`/config/blocked-users`)).data;

            return _messages.success(
                res,
                req,
                data,
                'ok',
                'mentoring',
                'find config by client id'
            );
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
                error.response?.data?.message ?? error.message,
                'mentoria',
                'findMyProfile'
            );
        }
    },

    async isBlocked(id) {
        try {
            const { data } = await mentoringApi.get(`/config/blocked/${id}`);
            return data.data;
        } catch (error) {
            console.log(error)
        }
    },
};

module.exports = mentorConfigController;
