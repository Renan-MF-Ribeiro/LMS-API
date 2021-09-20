const { processTargetUsers, sendMessageToKafka } = require('./business')
const _messages = require('../../utils/messages')
const { Message } = require('./model')
const { pagination, ordernation } = require('../../utils/functions')

module.exports = {
    async createMessages (req, res) {
        try {
            const campaign = req.body
            const target = campaign.target

            const message = await Message.create(campaign)
            const targetUsers = await processTargetUsers(target)
            console.log(targetUsers)
            await sendMessageToKafka(campaign, targetUsers)

            _messages.success(res, req, message)
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'groups', 'get')
        }
    },

    async getMessages (req, res) {
        try {
            const { skip, limit } = pagination(req)
            const { order, sort } = ordernation(req)
            const searchBy = req.query.searchBy

            const messages = await Message
                .find(searchBy ? {
                    $or: [
                        { title: { $regex: searchBy, $options: 'i' } },
                        { text: { $regex: searchBy, $options: 'i' } },
                        { category: { $regex: searchBy, $options: 'i' } }],
                } : {})
                .sort({ [order]: sort })
                .skip(parseInt(skip))
                .limit(parseInt(limit))

            _messages.success(res, req, { messages })
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'users', 'returnUsers')
        }
    },
}
