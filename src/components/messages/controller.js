const { processTargetUsers, sendMessageToKafka } = require('./business')
const _messages = require('../../utils/messages')
const { Message } = require('./model')
const { pagination, ordernation, getUserByToken } = require('../../utils/functions')
const { Item } = require('../items/model')
const config = require('../../../config.json')
const { sendMessage } = require('../../utils/web-push')

module.exports = {
    async createMessages (req, res) {
        try {
            const campaign = req.body
            const target = campaign.target

            const message = await Message.create(campaign)
            const targetUsers = await processTargetUsers(target, campaign.category)
            console.log(targetUsers)
            await sendMessageToKafka(campaign, targetUsers)

            _messages.success(res, req, message)
        } catch (error) {
            console.log(error)
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'groups', 'get')
        }
    },



    async webPushMessage (req, res) {
        try {
            const user = await getUserByToken(req);
            const payload = req.body;

            for (const subscription of user.webPushAuthorization) {
                try {
                    await sendMessage(subscription, payload);
                } catch (error) {
                    console.error(error);
                    throw new Error('Erro no envio da mensagem via push: ' + error.message);
                }
            }

            _messages.success(res, req, '');

        } catch (error) {
            console.log(error);
            return _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'messages', 'returnUsers');
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

            const total = await Message
                .find(searchBy ? {
                    $or: [
                        { title: { $regex: searchBy, $options: 'i' } },
                        { text: { $regex: searchBy, $options: 'i' } },
                        { category: { $regex: searchBy, $options: 'i' } }],
                } : {}).count()

            _messages.success(res, req, { messages, total })
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'messages', 'returnUsers')
        }
    },

    async getMessageById (req, res) {
        try {
            const { id } = req.params
            const message = await Message.findOne({ _id: id })
            _messages.success(res, req, message)
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'messages', 'returnMessage')
        }
    },


    async notifyResponsibleUsers () {
        const today = new Date()
        const items = await Item.find({ expirationDate: { $exists: true } })
        const notificationDays = config.cron.notifyResponsibleUsers.notificationDays

        for (const item of items) {
            if (item.responsible) {
                const diffTime = Math.abs(today - item.expirationDate)
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                if (notificationDays.includes(diffDays)) {
                    const message = {
                        category: 'notify',
                        communication: ['notification', 'email'],
                        mode: 'manual',
                        target: {
                            type: 'users',
                            value: {
                                users: [item.responsible],
                            },
                        },
                        text: `O item ${item.title} perderá a validade em ${diffDays} dias!\n`,
                        textHtml: `<p>O item ${item.title} perderá a validade em ${diffDays} dias!<p>`,
                        thumbnail: config.messenger.emailTemplate.thumbnail,
                        title: `${item.title}`,
                    }
                    createMessagesFromBackend(message)
                }
            }
        }
    },
}
async function createMessagesFromBackend (body) {
    try {
        console.log(body)
        const campaign = body
        const target = campaign.target

        const message = await Message.create(campaign)
        const targetUsers = await processTargetUsers(target, campaign.category)
        await sendMessageToKafka(campaign, targetUsers)

    } catch (error) {
        console.log(error)
    }
}
