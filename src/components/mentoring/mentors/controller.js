const _messages = require('../../../utils/messages');
const { mentoringApi } = require('../http-adapter');
const { populateUserFields } = require('./business');

const mentorController = {
    async findMyProfile(req, res) {
        try {
            const { data } = await mentoringApi.get('/mentor/me');
            const populatedData = await populateUserFields('user', 'mentorId', data);
            return _messages.success(res, req, populatedData, 'ok', 'mentoring', 'findMyProfile');
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

    async getMentorCalendar(req, res) {
        const { mentorId, date } = req.params;
        const url = `/mentor/calendar/${mentorId}`

        try {
            const { data } = await mentoringApi.get(url, { params: { date } });
            return _messages.success(res, req, data, 'ok', 'mentoring', 'getMentorCalendar');
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

    async create(req, res) {
        try {
            const dto = req.body;
            const { data } = await mentoringApi.post('/mentor', dto);

            return _messages.success(res, req, data, 'ok', 'mentoring', 'findMyProfile');
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
