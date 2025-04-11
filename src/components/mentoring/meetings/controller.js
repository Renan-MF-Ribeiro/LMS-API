const _messages = require('../../../utils/messages');
const { mentoringApi } = require('../http-adapter');
const { populateUserFields } = require('../business');

const meetingController = {
    async create(req, res) {
        const body = req.body;
        try {
            const { data } = await mentoringApi.post(`/meetings/`, body);
            return _messages.success(
                res,
                req,
                data.data,
                'ok',
                'mentoring',
                'create new mentoring'
            );
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
                error.response?.data?.error?.internalMessage ?? error.message,
                'mentoria',
                'create new mentoring'
            );
        }
    },

    async sendFeedback(req, res) {
        const body = req.body;
        const { id } = req.params;
        console.log(id);
        try {
            const { data } = await mentoringApi.post(`/meetings/feedback/${id}`, body);
            return _messages.success(
                res,
                req,
                data.data,
                'ok',
                'mentoring',
                'create new mentoring'
            );
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
                error.response?.data?.error?.internalMessage ?? error.message,
                'mentoria',
                'send mentoring feedback'
            );
        }
    },

    async list(req, res) {
        try {
            const options = req.query;
            const { data } = await mentoringApi.get(`/meetings/`, { params: options });
            return _messages.success(res, req, data.data, 'ok', 'mentoring', 'list of meetings');
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
                'mentoria',
                'list of meetings'
            );
        }
    },

    async findMeetingsByMentorId(req, res) {
        try {
            const { id } = req.params;
            const { data } = await mentoringApi.get(`/meetings/mentor/${id}`);

            const populatedData = await populateUserFields(
                [
                    { fieldName: 'user', reference: 'mentorId' },
                    { fieldName: 'mentee', reference: 'menteeId' },
                ],
                data.data
            );
            return _messages.success(
                res,
                req,
                populatedData,
                'ok',
                'mentoring',
                'list of meetings'
            );
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
                'mentoria',
                'list of meetings'
            );
        }
    },

    async findMeetingById(req, res) {
        try {
            const options = req.query;
            const { data } = await mentoringApi.get(`/meetings/`, { params: options });
            const populatedData = await populateUserFields(
                [{ fieldName: 'user', reference: 'mentorId' }],
                data
            );
            return _messages.success(
                res,
                req,
                populatedData,
                'ok',
                'mentoring',
                'list of meetings'
            );
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
                'mentoria',
                'list of meetings'
            );
        }
    },

    async findFutureMeetingsByMentorId(req, res) {
        const { id } = req.params;
        try {
            const { data } = await mentoringApi.get(`/meetings/mentor/futuremeetings/${id}`);
            const populatedData = await populateUserFields(
                [{ fieldName: 'user', reference: 'mentorId' }],
                data
            );
            return _messages.success(
                res,
                req,
                populatedData.data,
                'ok',
                'mentoring',
                'list of meetings'
            );
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
                'mentoria',
                'list of meetings'
            );
        }
    },

    async findMyMenteeFutureMeetings(req, res) {
        try {
            const { data } = await mentoringApi.get(`/meetings/mentee/futuremeetings`);

            const populatedData = await populateUserFields(
                [{ fieldName: 'user', reference: 'mentorId' }],
                data
            );
            return _messages.success(
                res,
                req,
                populatedData.data,
                'ok',
                'mentoring',
                'list of meetings'
            );
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
                'mentoria',
                'list of meetings'
            );
        }
    },

    async getRecordMentee(req, res) {
        const { menteeId, mentorId } = req.params;
        try {
            const { data } = await mentoringApi.get(`/meetings/recordMentee`, {
                params: { menteeId, mentorId },
            });

            const populatedData = await populateUserFields(
                [{ fieldName: 'user', reference: 'mentorId' }, { fieldName: 'mentee', reference: 'menteeId' }],
                data
            );
            return _messages.success(
                res,
                req,
                populatedData.data,
                'ok',
                'mentoring',
                'list of meetings'
            );
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
                'mentoria',
                'list of meetings'
            );
        }
    },

    async update(req, res) {
        const { id } = req.params;
        const body = req.body;
        try {
            const { data } = await mentoringApi.patch(`/meetings/${id}`, body);
            return _messages.success(
                res,
                req,
                data,
                'ok',
                'mentoring',
                'update meeting successfully'
            );
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
                error.response?.data?.error?.internalMessage ?? error.message,
                'mentoria',
                'update meeting'
            );
        }
    },
};

module.exports = meetingController;
