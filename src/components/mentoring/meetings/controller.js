const _messages = require('../../../utils/messages');
const { mentoringApi } = require('../http-adapter');

const meetingController = {
    async create(req, res) {
        const body = req.body;
        try {
            const { data } = await mentoringApi.post(`/meetings/`, body);
            return _messages.success(res, req, data.data, 'ok', 'mentoring', 'create new mentoring');
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
        console.log(id)
        try {
            const { data } = await mentoringApi.post(`/meetings/feedback/${id}`, body);
            return _messages.success(res, req, data.data, 'ok', 'mentoring', 'create new mentoring');
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

    async findMeetingById(req, res) {
        try {
            const options = req.query;
            const { data } = await mentoringApi.get(`/meetings/`, { params: options });
            const populatedData = await populateUserFields('user', 'mentorId', data.data);
            return _messages.success(res, req, populatedData, 'ok', 'mentoring', 'list of meetings');
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
