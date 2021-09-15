const { processTargetUsers, sendMessageToKafka } = require('./business')
const _messages = require('../../utils/messages')

module.exports = {
    async createMessages (req, res) {
        try {
            const campaign = req.body

            const target = campaign.target

            const targetUsers = await processTargetUsers(target)
            await sendMessageToKafka(campaign, targetUsers)

            _messages.success(res, req, targetUsers)
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'groups', 'get')
        }
    },
}
