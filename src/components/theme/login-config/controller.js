const { Types } = require('mongoose')

const { ConfigLogin } = require('./model')
const _messages = require('../../../utils/messages')
const { getLoginConfig } = require('../../users/business')
const { IdpIntegrationModel } = require('../../idp-integration/models')

module.exports = {
    async createOrUpdate (req, res) {
        try {
            const body = req.body

            const ssoForm = body.ssoForm?.map(info => {
                return {
                    ...info,
                    _id: Types.ObjectId.isValid(info._id) ? info._id : new Types.ObjectId()
                }
            }) ?? [];

            const namesFromTo = ssoForm
                .map(info => ({ from: info.strategyNameFrom, to: info.strategyName }))
                .filter(info => info.from && info.to && info.from !== info.to);

            body.ssoForm = ssoForm;

            let config = await getLoginConfig()

            if (config) {
                config = await ConfigLogin.findByIdAndUpdate(config._id, body)
            } else {
                config = await ConfigLogin.create(body)
            }

            for await (const { from, to } of namesFromTo) {
                await IdpIntegrationModel.updateMany(
                    { strategyName: from },
                    { strategyName: to }
                )
            }

            return _messages.success(res, req, config)
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'ConfigLogin',
                'createOrUpdate',
            )
        }

    },

    async getConfigLogin (req, res) {
        try {
            const { configuration } = req.query;
            const isConfigurationEnabled = configuration === 'true';

            let fieldsToSelect = {
                createdAt: 0,
                updatedAt: 0,
                _id: 0,
                __v: 0,
                "formLogin._id": 0,
            };

            if (!isConfigurationEnabled) {
                fieldsToSelect = {
                    ...fieldsToSelect,
                    "ssoForm.certifier": 0,
                    "ssoForm.callback_url": 0,
                    "ssoForm.entrypoint": 0,
                    "ssoForm.claim": 0,
                    "ssoForm.claimKey": 0,
                    "ssoForm.issuer": 0
                };
            }

            const config = await getLoginConfig(fieldsToSelect);

            if (config) {
                return _messages.success(res, req, config)
            }

            return _messages.conflict(res, req, null)

        }
        catch (error) {
            console.error(error)
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'config',
                'getConfigLogin',
            )
        }
    }
}
