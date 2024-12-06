const ApiError = require('../../errors/ApiError');
const { removeAccents } = require('../../utils/functions');
const { Group } = require('../groups/model');
const _business = require('./business');
const {
    ConfigTypes,
    ConfigModel,
    SegmentationConfigModel,
    SegmentationRuleSchema,
} = require('./model');
const _messages = require('../../utils/messages');
const { Types } = require('mongoose');
const axios = require('axios');
const { getConnectMap } = require('../../utils/connect');

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

        const map = await getConnectMap();
        const owner = Object.entries(map).find(([_, v]) => v === issuer)[0];

        const created = await SegmentationConfigModel.findOneAndUpdate(
            {},
            {
                $set: {
                    'value.rule': {
                        name: rule.name,
                        issuer: owner,
                    },
                },
            },
            { new: true }
        );

        return _messages.success(res, req, created.value);
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

        const map = await getConnectMap();
        const owner = Object.entries(map).find(([_, v]) => v === issuer)[0];

        const updated = await SegmentationConfigModel.findOneAndUpdate(
            {},
            {
                $set: {
                    'value.rule.name': rule.name,
                    'value.rule.issuer': owner,
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

        const map = await getConnectMap();
        const owner = Object.entries(map).find(([_, v]) => v === issuer)[0];

        const created = await SegmentationConfigModel.findOneAndUpdate(
            {},
            {
                $push: {
                    'value.exceptions': {
                        name: exception.name,
                        issuer: owner,
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
};
