const { Types } = require('mongoose')

const { ConfigLogin } = require('./model')
const _messages = require('../../../utils/messages')
const { getLoginConfig } = require('../../users/business')
const { IdpIntegrationModel } = require('../../idp-integration/models')
const { createStrategiesFromLoginConfigs, removeStrategies } = require('../../../utils/sso/passport')
const { removeFromCache } = require('../../../utils/cache/store')

module.exports = {
    async createOrUpdate(req, res) {
        const body = req.body

        body.ssoForm = processForm(body.ssoForm)
            .map(removeEmptyFields)
            .map(info => ({
                ...info,
                scope: info.scope ? info.scope.split(',').map(scope => scope.trim()) : [],
            }));

        const namesFromTo = body.ssoForm
            .map(info => ({ from: info.strategyNameFrom, to: info.strategyName }))
            .filter(info => info.from && info.to && info.from !== info.to);

        let config = await getLoginConfig()

        const strategiesToDisable = getStrategiesToDisable(config?.ssoForm || [], body.ssoForm);

        if (config) {
            config = await ConfigLogin.findByIdAndUpdate(config._id, body)
        } else {
            config = await ConfigLogin.create(body)
        }

        await Promise.all(
            namesFromTo.map(({ from, to }) =>
                IdpIntegrationModel.updateMany({ strategyName: from }, { strategyName: to })
            )
        );

        if (strategiesToDisable?.length) {
            removeStrategies(strategiesToDisable);
        }

        await createStrategiesFromLoginConfigs();

        removeFromCache('/theme/login-config', true);

        return _messages.success(res, req, config)
    },

    async getConfigLogin(req, res) {
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
                "ssoForm.callbackUrl": 0,
                "ssoForm.entrypoint": 0,
                "ssoForm.claim": 0,
                "ssoForm.claimKey": 0,
                "ssoForm.issuer": 0,
                "ssoForm.clientId": 0,
                "ssoForm.clientSecret": 0,
                "ssoForm.authorizationUrl": 0,
                "ssoForm.tokenUrl": 0,
                "ssoForm.userInfoUrl": 0,
            };
        }

        const config = await getLoginConfig(fieldsToSelect);

        if (config) {
            return _messages.success(res, req, config)
        }

        return _messages.conflict(res, req, null)
    }
}

const processForm = (form) => {
    return Array.isArray(form)
        ? form.map(info => ({
            ...info,
            _id: Types.ObjectId.isValid(info._id) ? info._id : new Types.ObjectId()
        }))
        : [];
};

const getStrategiesToDisable = (configForm = [], newForm = []) => {
    const removedStrategies = configForm.filter(
        info => info.strategyName && !newForm.some(newInfo => newInfo.strategyName === info.strategyName)
    );
    const disabledStrategies = newForm.filter(info => info.strategyName && !info.enabled);

    return [...removedStrategies, ...disabledStrategies].map(info => info.strategyName);
};

function removeEmptyFields(obj) {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, v]) => v !== "" && v !== null)
    );
}
