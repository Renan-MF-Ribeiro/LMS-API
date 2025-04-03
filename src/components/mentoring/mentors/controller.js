const _messages = require('../../../utils/messages');
const { mentoringApi } = require('../http-adapter');

const mentorController = {
    async findMyProfile(req, res) {
        try {
            const mentorPorfile = await mentoringApi.get('/mentor/me');
            return _messages.success(res, req, mentorPorfile, 'ok', 'mentoring', 'findMyProfile');
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
};

module.exports = mentorController;
