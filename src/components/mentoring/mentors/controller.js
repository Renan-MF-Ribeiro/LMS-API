const _messages = require('../../../utils/messages');
const { mentoringApi } = require('../http-adapter');
const { populateUserFields } = require('./business');

const mentorController = {
    async findMentorProfile(req, res) {
        try {
            const { param } = req.params;
            const { data } = await mentoringApi.get(`/mentor/profile/${param || ''}`);
            const populatedData = await populateUserFields('user', 'mentorId', data.data);

            return _messages.success(res, req, populatedData, 'ok', 'mentoring', 'findMyProfile');
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
                error.response?.data?.error?.internalMessage ?? error.message,
                'mentoria',
                'find mentor profile'
            );
        }
    },

    async getMentorCalendar(req, res) {
        const { mentorId } = req.params;
        const { month } = req.query;
        const url = `/mentor/calendar/${mentorId}`;

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

    async getMentorsByAcessorId(req, res) {
        const { acessorId } = req.params;
        const url = `/mentor/acessor/${acessorId}`;

        try {
            const { data } = await mentoringApi.get(url);
            const populatedData = await populateUserFields(
                [
                    { fieldName: 'user', reference: 'userId' },
                    { fieldName: 'assistant', reference: 'assistantId' }
                ],
                data
            );
            return _messages.success(
                res,
                req,
                populatedData.data,
                'ok',
                'mentoring',
                'getMentorCalendar'
            );
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

            return _messages.success(res, req, data.data, 'ok', 'mentoring', 'searchMentors');
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
    },

    async findAll(req, res) {
        try {
            const options = { ...req.query };
            const { data } = await mentoringApi.get('/mentor', { params: options });
            console.log(data);
            const populatedData = await populateUserFields('user', 'userId', data);
            return _messages.success(res, req, populatedData, 'ok', 'mentoring', 'findMentors');
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
                error.response?.data?.error?.internalMessage ?? error.message,
                'mentoria',
                'find mentors'
            );
        }
    },

    async findMyProfile(req, res) {
        // Não excluir essa função vazia!!!
        // Sem ela, não é possivel utilizar a rota "/mentoring/mentors/profile"
    },

    async findCompletedMentorings(req, res) {
        // Não excluir essa função vazia!!!
        // Sem ela, não é possivel utilizar a rota "/mentoring/mentors/historic"
    },

    async findCompletedMentorings(req, res) {
        try {
            const { param } = req.params;
            const { data } = await mentoringApi.get(
                `/meetings/mentor/historic/${param ? param : ''}`
            );
            const populatedData = await populateUserFields('user', 'mentorId', data);
            return _messages.success(res, req, populatedData, 'ok', 'mentoring', 'findMyProfile');
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
                error.response?.data?.error?.internalMessage ?? error.message,
                'mentoria',
                'find mentor historic'
            );
        }
    },
};

module.exports = mentorController;
