const _messages = require('../../../utils/messages');
const { mentoringApi } = require('../http-adapter');
const { populateUserFields, getHierarchicalMentorIds, populateBlockedUserFields } = require('../business');
const { User } = require('../../users/model');
const { Types } = require('mongoose');
const { getUserByToken } = require('../../../utils/functions');

const mentorController = {
    async findMentorProfile(req, res) {
        try {
            const { param } = req.params;

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const receivedEmail = emailRegex.test(param);

            const query = receivedEmail ? { email: param } : { _id: Types.ObjectId(param) };

            const user = await User.findOne(query).lean();
            const { data } = await mentoringApi.get(`/mentor/profile/${user._id}`);

            const populatedData = await populateUserFields(
                [
                    { fieldName: 'user', reference: 'mentorId' },
                    { fieldName: 'mentee', reference: 'menteeId' },
                ],
                data
            );
            return _messages.success(
                res,
                req,
                populatedData.data,
                'ok',
                'mentoring',
                'findMyProfile'
            );
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

    async findMentor(req, res) {
        try {
            const { mentorId } = req.params;
            const { data } = await mentoringApi.get(`/mentor/find/${mentorId}`);
            const populatedData = await populateUserFields(
                [
                    { fieldName: 'user', reference: 'userId' },
                    { fieldName: 'assistant', reference: 'assistant' },
                ],
                data
            );
            return _messages.success(
                res,
                req,
                populatedData.data,
                'ok',
                'mentoring',
                'findMyProfile'
            );
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

    async updateMentor(req, res) {
        const body = req.body;
        try {
            const { mentorId } = req.params;
            const assistantIds = body.assistant || [];
            const assistants = await User.find(
                { _id: { $in: assistantIds } },
                '_id email name'
            ).lean();

            body.assistant = assistants;

            const { data } = await mentoringApi.put(`/mentor/${mentorId}`, body);

            return _messages.success(res, req, data, 'ok', 'mentoring', 'updateMentor');
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
                error.response?.data?.error?.internalMessage ?? error.message,
                'mentoria',
                'updateMentor'
            );
        }
    },

    async getMentorCalendar(req, res) {
        const { mentorId } = req.params;
        const { month, mentoringDeadLine } = req.query;
        const url = `/mentor/calendar/`;
        try {
            const foundMentor = await User.findOne({ _id: mentorId }, 'email name _id').lean();

            if (!foundMentor) {
                return _messages.notFound(
                    res,
                    req,
                    'Mentor not found',
                    'Mentor not found',
                    'mentoria',
                    'get mentor`s calendar'
                );
            }
            const body = {
                mentor: {
                    email: foundMentor.email,
                    name: foundMentor.name,
                    userId: foundMentor._id,
                },
                month: Number(month || new Date().getMonth()),
                deadline: mentoringDeadLine === 'true',
            };
            const { data } = await mentoringApi.post(url, body);

            return _messages.success(res, req, data.data, 'ok', 'mentoring', 'getMentorCalendar');
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
                    { fieldName: 'assistant', reference: 'assistantId' },
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
            const assistantIds = dto.assistant || [];
            const assistants = await User.find(
                { _id: { $in: assistantIds } },
                '_id email name'
            ).lean();

            dto.assistant = assistants;
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
            const { name, weekdays, date, topics, pageSize, pageIndex, orderBy } = req.query;

            let params = {
                searchBy: name,
                weekdays,
                date,
                topics,
                pageSize: pageSize || 12,
                pageIndex: pageIndex || 0,
                orderBy,
            };

            const hierarchicalMentors = await getHierarchicalMentorIds(req);
            if (hierarchicalMentors.length > 0)
                params.mentorIds = hierarchicalMentors;

            const { data } = await mentoringApi.post('/mentor/search', params);

            const populatedData = await populateUserFields(
                [
                    { fieldName: 'user', reference: 'userId' },
                    { fieldName: 'assistant', reference: 'assistantId' },
                ],
                data.data
            );

            return _messages.success(res, req, populatedData, 'ok', 'mentoring', 'searchMentors');
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

    async searchAdmin(req, res) {
        try {
            const { name } = req.query;

            const params = { name };
            const { data } = await mentoringApi.get('/mentor/admin', { params });
            const populatedData = await populateUserFields(
                [
                    { fieldName: 'user', reference: 'userId' },
                    { fieldName: 'assistant', reference: 'assistantId' },
                ],
                data
            );

            return _messages.success(
                res,
                req,
                populatedData.data,
                'ok',
                'mentoring',
                'searchAdmin'
            );
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

            const populatedData = await populateUserFields(
                [
                    { fieldName: 'user', reference: 'userId' },
                    { fieldName: 'assistant', reference: 'assistantId' },
                ],
                data
            );
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
            const populatedData = await populateUserFields(
                [
                    { fieldName: 'user', reference: 'userId' },
                    { fieldName: 'mentee', reference: 'menteeId' },
                ],
                data
            );
            return _messages.success(
                res,
                req,
                populatedData.data,
                'ok',
                'mentoring',
                'findMyProfile'
            );
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
