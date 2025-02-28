const { Webhooks } = require('./model')
const _messages = require('../../utils/messages')
const axios = require('axios')
const crypto = require('crypto')

module.exports = {
    async dispatch(action, target, load = false, data) {
        const webhook = await Webhooks.findOne({ target: target, action: action }).lean()
        console.log(target, action)
        const body = {
            data,
            label: webhook.label,
            target: webhook.target,
            action: load ? 'load' : webhook.action
        }
        if (webhook && webhook.status) {
            const secret = process.env.WEBHOOK_SECRET_KEY;
            const payload = JSON.stringify(body);

            const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');

            const url = webhook.endpoint;
            await axios.post(url, body, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Signature': hmac,
                    'clientId': process.env.CLIENT_ID
                }
            });

            return 
        }
    },
    async update(req, res) {
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

    async getWebhooks(req, res) {
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
