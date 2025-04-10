const _messages = require('../../../utils/messages');
const { mentoringApi } = require('../http-adapter');
const { populateUserFields } = require('../mentors/business');

module.exports = {
    async sendApplication(req, res) {
        const body = req.body;
        try {
            const { data } = await mentoringApi.post(`/applications/send`, body);
            return _messages.success(
                res,
                req,
                data,
                'ok',
                'mentoring',
                'application submitted successfully'
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

    async getApplicationByUserId(req, res) {
        try {
            const { data } = await mentoringApi.get(`/applications/user`);
            return _messages.success(res, req, data.data, 'ok', 'mentoring');
        } catch (error) {
            console.error('Error fetching applications by user ID:', error);
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

    async getApplicationsByStatus(req, res) {
        try {
            const { status } = req.params;
            const options = { ...req.query };

            const { data } = await mentoringApi.get(`/applications/status/${status}`, { params: options });

            const populatedData = await populateUserFields(
                [
                    { fieldName: 'user', reference: 'userId' }
                ],
                data
            );
            return _messages.success(res, req, populatedData, 'ok', 'mentoring');
        } catch (error) {
            console.error('Error fetching applications by status:', error);
            res.status(500).json({ message: 'Failed to fetch applications', error: error.message });
        }
    },

    async update(req, res) {
        const { id } = req.params;
        const body = req.body;
        try {
            const { data } = await mentoringApi.post(`/applications/update/${id}`, body);
            return _messages.success(
                res,
                req,
                data,
                'ok',
                'mentoring',
                'feedback sent successfully'
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
};
