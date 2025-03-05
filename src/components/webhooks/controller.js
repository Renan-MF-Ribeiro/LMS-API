const { Webhooks } = require('./model')
const _messages = require('../../utils/messages')
const { WebhooksDefault } = require('./constants')

module.exports = {
    async update (req, res) {
        try {
            const body = req.body
            let webhooks = await Webhooks.findOne({ _id: body._id }).sort({ createdAt: -1 })
            if (webhooks) {
                webhooks = await Webhooks.findByIdAndUpdate(webhooks._id, req.body)
            } else {
                webhooks = await Webhooks.create(req.body)
            }

            return _messages.success(res, req, webhooks)

        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'webhooks',
                'createOrUpdate',
            )
        }

    },

    async getWebhooks (req, res) {
        try {

            const data = await Webhooks.find()
            for (const webhook of WebhooksDefault) {
                const exists = data.some(item => item.target === webhook.target && item.action === webhook.action);
                if (!exists) {
                    const newWebhook = await Webhooks.create(webhook);
                    data.push(newWebhook)
                }
            }
            _messages.success(res, req, data);
        }
        catch (error) {
            console.error(error)
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'Webhooks',
                'getWebhooks',
            )
        }
    }
}
