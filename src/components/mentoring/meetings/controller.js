const _messages = require('../../../utils/messages');
const { mentoringApi } = require('../http-adapter');
const { populateUserFields } = require('../business');
const { User } = require('../../users/model');
const { Types } = require('mongoose');

const meetingController = {
    async create(req, res) {
        const body = req.body;

        if (body.menteeId) {
            const [user, mentor] = await Promise.all([
                User.findOne({ _id: new Types.ObjectId(body.menteeId) }).lean(),
                User.findOne({ _id: new Types.ObjectId(body.mentorId) }).lean(),
            ]);

            if(!user || !mentor) {
                return _messages.badRequest(
                    res,
                    req,
                    'User or mentor not found',
                    'User or mentor not found',
                    'mentoria',
                    'create new mentoring'
                );
            }
            
            body.menteeEmail = user?.email;
            body.menteeName = user?.name;
            body.mentorName = mentor?.name;
            body.mentorEmail = mentor?.email;
        }
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
            console.log(error);
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

    async deleteMeeting(req, res) {
        const { id } = req.params;
        try {
            const { data } = await mentoringApi.delete(`/meetings/${id}`);
            return _messages.success(res, req, data.data, 'ok', 'mentoring', 'delete mentoring');
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

    async sendComment(req, res) {
        const body = req.body;
        const { id } = req.params;
        try {
            const { data } = await mentoringApi.post(`/comments/${id}`, body);
            const PopulatedData = await populateUserFields(
                [{ fieldName: 'user', reference: 'userId' }],
                data
            );
            return _messages.success(
                res,
                req,
                PopulatedData.data,
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

    async listCommentsByMeeting(req, res) {
        const body = req.body;
        const { id } = req.params;
        try {
            const { data } = await mentoringApi.get(`/comments/meetings/${id}`, body);
            const populatedData = await populateUserFields(
                [{ fieldName: 'user', reference: 'userId' }],
                data
            );
            return _messages.success(
                res,
                req,
                populatedData.data,
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
            const options = req.query;
            let searchIds = [];

            if (options.searchBy) {
                const searchRegex = new RegExp(options.searchBy, 'i');
                const user = await User.find({ name: searchRegex, email: searchRegex })
                    .select('_id')
                    .lean();
                searchIds = user.map((user) => user._id.toString());

                options.searchBy = searchIds;
            }

            const { data } = await mentoringApi.get(`/meetings/mentor/${id}`, { params: options });

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
                error.response?.data?.error?.internalMessage ?? error.message,
                'list of meetings'
            );
        }
    },

    async findMeetingById(req, res) {
        try {
            const { id } = req.params;
            const { data } = await mentoringApi.get(`/meetings/${id}`);
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
                [{ fieldName: 'user', reference: 'userId' }],
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

    async findMyMenteePendingMeetings(req, res) {
        try {
            const programId = req.query.programId;
            const { data } = await mentoringApi.get(`/meetings/mentee/pendingmeetings`, {
                params: { programId: programId },
            });

            const populatedData = await populateUserFields(
                [{ fieldName: 'user', reference: 'userId' }],
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
            const programId = req.query.programId;
            const { data } = await mentoringApi.get(`/meetings/mentee/futuremeetings`, {
                params: { programId: programId },
            });

            const populatedData = await populateUserFields(
                [{ fieldName: 'user', reference: 'userId' }],
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

    async update(req, res) {
        const { id } = req.params;
        const body = req.body;

        try {
            if (body.menteeId) {
                const user = await User.findOne({ _id: new Types.ObjectId(body.menteeId) });
                body.menteeEmail = user.email;
            }

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
