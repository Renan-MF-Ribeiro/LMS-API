const _messages = require('../../../utils/messages');
const { mentoringApi } = require('../http-adapter');
const { populateUserFields } = require('../business');

const mentorController = {

    async findCompletedMentorings(req, res) {
        try {
            const { param } = req.params;
            const { data } = await mentoringApi.get(`/meetings/mentoree/historic/${param ? param : ''}`);
            const PopulatedData = await populateUserFields(
                [{ fieldName: 'user', reference: 'userId' }],
                data
            );

            return _messages.success(res, req, PopulatedData.data, 'ok', 'mentoring', 'find mentoree`s historic');
        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
                error.response?.data?.error?.internalMessage ?? error.message,
                'mentoria',
                'find mentoree`s historic'
            );
        }
    },
};

module.exports = mentorController;
