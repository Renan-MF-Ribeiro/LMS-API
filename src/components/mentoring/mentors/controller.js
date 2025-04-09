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
                error.response?.data?.error?.internalMessage ?? error.message,
                'mentoria',
                'findMyProfile'
            );
        }
    },

    async getMentorCalendar(req, res) {
        const { mentorId } = req.params;
        const { month } = req.query
        const url = `/mentor/calendar/${mentorId}`

        try {
            const { data } = await mentoringApi.get(url, { params: { month } });
            return _messages.success(res, req, data, 'ok', 'mentoring', 'getMentorCalendar');
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
                error.response?.data?.error?.internalMessage ?? error.message,
                'mentoria',
                'get mentor`s calendar'
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
                error.response?.data?.error?.internalMessage ?? error.message,
                'mentoria',
                'create new mentor'
            );
        }
    },

    async searchMentors(req, res) {
        try {
            const { name, weekdays, date, topics, options } = req.query;

            const params = { name, weekdays, date, topics, options };
            const { data } = await mentoringApi.get('/mentor/search', { params });

            return _messages.success(res, req, data, 'ok', 'mentoring', 'searchMentors');
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
                error.response?.data?.error?.internalMessage ?? error.message,
                'mentoria',
                'search mentors'
            );
        }
    }
};

module.exports = mentorController;
