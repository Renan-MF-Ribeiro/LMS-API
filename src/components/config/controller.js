const ApiError = require('../../errors/ApiError');
const { removeAccents, getUserByToken, slugify, getCustomEmail } = require('../../utils/functions');
const { Group } = require('../groups/model');
const _business = require('./business');
const {
    ConfigTypes,
    ConfigModel,
    SegmentationConfigModel,
    MATRIX_VISIBILITY_MODE,
    MatrixConfigModel,
} = require('./model');
const _messages = require('../../utils/messages');
const { Types } = require('mongoose');

module.exports = {
    async getAutomaticEligibilityOnboardConfig(req, res) {
        const config = await _business.getConfiguration(ConfigTypes.AutomaticEligibility.Onboard);

        res.json({
            config: { onboard: config ?? { enabled: false, days: 0, eligibility: [] } },
        });
    },

    async updateAutomaticEligibilityOnboardConfig(req, res) {
        const config = req.body.config?.onboard;

        if (!config) {
            throw new ApiError('Invalid onboard config');
        }

        const eligibility = (config.eligibility?.filter(Boolean) ?? []).map(removeAccents);

        const currentGroups = await Group.find({ name: { $in: eligibility } }).select('_id name');

        const newGroups = eligibility.filter(
            (group) => !currentGroups.find((g) => g.name === group)
        );

        if (newGroups.length) {
            await Group.insertMany(
                newGroups.map((name) => ({ name, tags: [], deleted: 0, active: 1 }))
            );
        }

        await _business.saveConfiguration(ConfigTypes.AutomaticEligibility.Onboard, {
            ...config,
            eligibility,
        });

        res.json({
            config: { onboard: config },
        });
    },

    async getSegmentation(req, res) {
        const config = await _business.getSegmentation();

        _messages.success(res, req, config.value);
    },

    async createRule(req, res) {
        const { name, issuer } = req.body;

        const rule = { name, issuer };

        if (!rule?.name || !rule?.issuer) {
            return _messages.badRequest(res, req, null, 'Payload mal formado.');
        }

        const segmentation = await _business.getSegmentation();

        if (segmentation.value?.rule) {
            return _messages.badRequest(res, req, null, 'Já existe uma regra criada.');
        }

        const created = await SegmentationConfigModel.findOneAndUpdate(
            {},
            {
                $set: {
                    'value.rule': {
                        name: rule.name,
                        issuer: rule.issuer,
                    },
                },
            },
            { new: true }
        );

        return _messages.success(res, req, created.value);
    },

    async setManagerRule(req, res) {
        const rules = req.body;

        if (!rules) {

            const emptyRule = {
                rules: [],
                useIsManagerFlag: true,
            }

            ConfigModel.findOneAndUpdate(
                { type: ConfigTypes.ManagerRule },
                { value: emptyRule },
                { new: true }
            );
            return _messages.successEmpty(res, req, 'Regra de gestores aplicada com sucesso.');
        }

        await ConfigModel.findOneAndUpdate(
            { type: ConfigTypes.ManagerRule },
            {
                value: {
                    rules: rules.rules || [],
                    useIsManagerFlag: rules.useIsManagerFlag ?? true,
                }
            },
            { new: true, upsert: true }
        );

        return _messages.success(res, req, 'Regra de gestores aplicada com sucesso');
    },

    async getManagerRule(req, res) {
        const rule = await _business.getManagerRule();
        return _messages.success(res, req, rule);
    },

    async updateRule(req, res) {
        const { ruleId } = req.params;
        const { name, issuer } = req.body;

        const rule = { ruleId, name, issuer };

        if (!ruleId || !rule?.name || !rule?.issuer) {
            return _messages.badRequest(res, req, null, 'Payload mal formado.');
        }

        const segmentation = await _business.getSegmentation();

        if (!segmentation.value.rule?._id.equals(ruleId)) {
            return _messages.badRequest(res, req, null, 'A regra informada não foi identificada.');
        }

        if (segmentation.value.exceptions?.some((e) => e.issuer === issuer)) {
            return _messages.badRequest(
                res,
                req,
                null,
                'O campo da carga informado já está sendo utilizado em alguma exceção.'
            );
        }

        const updated = await SegmentationConfigModel.findOneAndUpdate(
            {},
            {
                $set: {
                    'value.rule.name': rule.name,
                    'value.rule.issuer': rule.issuer,
                },
            },
            { new: true }
        );

        return _messages.success(res, req, updated.value);
    },

    async createException(req, res) {
        const { name, issuer, value } = req.body;

        const exception = { name, issuer, value };

        if (!exception?.name || !exception?.issuer || !exception?.value) {
            return _messages.badRequest(res, req, null, 'Payload mal formado.');
        }

        const segmentation = await _business.getSegmentation();

        if (!segmentation.value?.rule) {
            return _messages.badRequest(
                res,
                req,
                null,
                'Não é possível criar uma exceção sem uma regra existente.'
            );
        }

        if (segmentation.value.rule.issuer === exception.issuer) {
            return _messages.badRequest(
                res,
                req,
                null,
                'O campo da carga informado já está vinculado a regra.'
            );
        }

        const checkExceptionExists = await _business.checkExceptionExists(exception, segmentation);

        if (checkExceptionExists?.error) {
            return _messages.conflict(res, req, null, checkExceptionExists.error);
        }

        const created = await SegmentationConfigModel.findOneAndUpdate(
            {},
            {
                $push: {
                    'value.exceptions': {
                        name: exception.name,
                        issuer: exception.issuer,
                        value: exception.value,
                    },
                },
            },
            { new: true }
        );

        return _messages.success(res, req, created.value);
    },

    async updateException(req, res) {
        const { exceptionId } = req.params;
        const { name, value } = req.body;

        if (!exceptionId || !name || !value) {
            return _messages.badRequest(res, req, null, 'Payload mal formado.');
        }

        const segmentation = await _business.getSegmentation();

        const exception = segmentation.value?.exceptions.find((e) => e._id.equals(exceptionId));

        if (!exception) {
            return _messages.badRequest(res, req, null, 'A exceção informada não existe.');
        }

        const checkExceptionExists = await _business.checkExceptionExists(exception, segmentation);

        if (checkExceptionExists?.error) {
            return _messages.conflict(res, req, null, checkExceptionExists.error);
        }

        const updated = await SegmentationConfigModel.findOneAndUpdate(
            {},
            {
                $set: {
                    'value.exceptions.$[exception].name': name,
                    'value.exceptions.$[exception].value': value,
                },
            },
            {
                new: true,
                arrayFilters: [
                    {
                        'exception._id': { $eq: new Types.ObjectId(exceptionId) },
                    },
                ],
            }
        );

        return _messages.success(res, req, updated);
    },

    async deleteException(req, res) {
        const { exceptionId } = req.params;

        const deleted = await SegmentationConfigModel.findOneAndUpdate(
            {},
            {
                $pull: {
                    'value.exceptions': {
                        _id: new Types.ObjectId(exceptionId),
                    },
                },
            },
            {
                new: true,
            }
        );

        return _messages.success(res, req, deleted);
    },

    async getMatrixUserVisibility(req, res) {
        const config = await _business.getMatrixConfig();

        return _messages.success(res, req, config.value);
    },

    async updateMatrixUserVisibility(req, res) {
        const visibilityMode = req?.body?.visibilityMode;
        const allowedValues = Object.values(MATRIX_VISIBILITY_MODE);

        if (!visibilityMode || !allowedValues.includes(visibilityMode)) {
            const err = `Invalid visibilityMode. Accepted values are: ${allowedValues.join(', ')}`;
            return _messages.badRequest(res, req, err, err);
        }

        const config = await _business.getMatrixConfig();

        const updated = await MatrixConfigModel.findOneAndUpdate(
            { _id: config._id },
            {
                $set: {
                    value: {
                        visibilityMode,
                    },
                },
            },
            { new: true }
        );

        return _messages.success(res, req, updated.value);
    },

    async getCompanySupportFormConfig(req, res) {
        const companyConfig = await _business.getCompanyConfig();

        const supportFormConfig = companyConfig?.supportFormCustomEmail || null;

        if (!supportFormConfig || !Array.isArray(supportFormConfig) || supportFormConfig.length < 2 || !req.headers?.authorization) {
            return _messages.success(res, req, {
                supportFormConfig,
                customEmail: null,
            });
        }

        const user = await getUserByToken(req);
        const { customEmail, domain } = await getCustomEmail(user);

        return _messages.success(res, req, {
            supportFormConfig: [supportFormConfig, domain],
            customEmail: customEmail ? customEmail : null,
        });
    }
};
