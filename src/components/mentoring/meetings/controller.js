const _messages = require('../../../utils/messages');
const { mentoringApi } = require('../http-adapter');

const meetingController = {

    async create(req, res) {
        const body = req.body;
        try {
            const { data } = await mentoringApi.post(`/meetings/`, body);
            return _messages.success(res, req, data, 'ok', 'mentoring', 'create new mentoring');

        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
                JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
                'mentoria',
                'create new mentoring'
            );
        }
    },
};

module.exports = meetingController;
