const { mentoringApi } = require('../http-adapter');
const _messages = require('../../../utils/messages');
module.exports = {
    async findMyProfile(req, res) {
        try {
            const mentorPorfile = await mentoringApi.get('/mentor/me');
            return _messages.success(res, req, mentorPorfile, 'ok', 'social', 'shareSocialContent');
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.response?.data?.message ?? error.message,
                error.response?.data?.message ?? error.message,
                'mentoria',
                'findMyProfile'
            );
        }
    },
};
