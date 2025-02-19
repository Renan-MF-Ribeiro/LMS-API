const { Webhooks } = require('./model')
const _messages = require('../../utils/messages')
const axios = require('axios')

module.exports = {
    async dispatch (action, target, data) {
        try {
            const webhook = await Webhooks.findOne({target: target, action: action})
            if (webhook && webhook.status) {
                console.log(data)
                await axios.post(webhook.endpoint, data)
                return "Webhook dispatched"
            } else {
                throw new Error('Webhook not found or inactive')
            } 
        } catch (error) {
            console.log(error)
            throw new Error(error.message)
        }                
    },
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
