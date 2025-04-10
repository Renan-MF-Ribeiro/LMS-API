const _messages = require('../../../utils/messages');
const { mentoringApi } = require('../http-adapter');

const {
    azureBlob,
} = require('../../../utils/files');

const mentorConfigController = {
    async findByClientId(req, res) {
        try {
            const { data } = await mentoringApi.get(`/config/${process.env.CLIENT_ID}`);
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
            const { data } = await mentoringApi.get(`/config/home`);
            console.log(data)
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
    }
};

module.exports = mentorConfigController;
