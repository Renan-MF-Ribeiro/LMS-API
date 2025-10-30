const { Webhooks } = require('./model')
const _messages = require('../../utils/messages')
const axios = require('axios')
const crypto = require('crypto')
const { WebhooksDefault } = require('./constants')

module.exports = {
    async dispatch(action, target, load = false, data) {
        try {
            if (target === 'users' && !Array.isArray(data) && data?.password)
                delete data.password

            const webhook = await Webhooks.findOne({ target, action }).lean()
            if (webhook?.status) {
                // console.log('DISPARANDO WEBHOOK')
                const body = {
                    data: data,
                    label: webhook.label,
                    endpoint: webhook.endpoint,
                    target: webhook.target,
                    action: webhook.action,
                    auth: webhook.auth
                }
                const secret = process.env.WEBHOOK_SECRET_KEY;
                const payload = JSON.stringify(body);
                const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');

                const url = `${process.env.API_WEBHOOK}/webhook`;
                await axios.post(url, body, {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Webhook-Signature': hmac,
                        'x-api-key': process.env.API_KEY_WEBHOOK,
                        'clientId': process.env.CLIENT_ID
                    }
                });
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
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
