const _messages = require('../../../utils/messages');
const { newsApi } = require('../http-adapter');
const { azureBlob } = require('../../../utils/files');
const { UsersWithProcessedTags } = require('../../courses/model');

const moment = require('moment');

const campaignsController = {
    getCampaign: async (req, res) => {
        try {
            const { id } = req.params;
            const { data } = await newsApi.get(`/campaigns/${id}`);

            return _messages.success(res, req, data, 'ok', 'news', 'getCampaign');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;

            return _messages.internalServer(res, req, message, message, 'news', 'getCampaign');
        }
    },

    listCampaigns: async (req, res) => {
        try {
            const options = req.query;
            const { data } = await newsApi.get('/campaigns', { params: options });

            return _messages.success(res, req, data, 'ok', 'news', 'listCampaigns');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;

            return _messages.internalServer(res, req, message, message, 'news', 'listCampaigns');
        }
    },

    createCampaign: async (req, res) => {
        try {
            const payload = JSON.parse(req.fields.payload);

            const { thumb } = req.files;
            if (thumb) {
                const thumbPath = await azureBlob(thumb, 'news/banners');

                payload.thumbPath = thumbPath;
            }

            const { data } = await newsApi.post('/campaigns', payload);

            return _messages.success(res, req, data, 'ok', 'news', 'createCampaign');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;

            return _messages.internalServer(res, req, message, message, 'news', 'createCampaign');
        }
    },

    updateCampaign: async (req, res) => {
        try {
            const { id } = req.params;
            const payload = JSON.parse(req.fields.payload);

            const { thumb } = req.files;
            if (thumb) {
                const thumbPath = await azureBlob(thumb, 'news/banners');

                payload.thumbPath = thumbPath;
            }

            const { data } = await newsApi.put(`/campaigns/${id}`, payload);

            return _messages.success(res, req, data, 'ok', 'news', 'updateCampaign');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;

            return _messages.internalServer(res, req, message, message, 'news', 'updateCampaign');
        }
    },

    getEligibleUsers: async (req, res) => {
        try {
            const { id } = req.params;
            const { data } = await newsApi.get(`/campaigns/${id}`);

            const tags = data.eligibilities;
            if (!tags || tags.length === 0) {
                return _messages.successEmpty(
                    res,
                    req,
                    'Campanha não possui elegibilidade definida',
                    'news',
                    'getEligibleUsers'
                );
            }

            const usersWithTags = await UsersWithProcessedTags.find({
                userTags: { $in: tags },
            });

            return _messages.success(
                res,
                req,
                { eligibleUsers: usersWithTags },
                'ok',
                'news',
                'getEligibleUsers'
            );
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            return _messages.internalServer(res, req, message, message, 'news', 'getEligibleUsers');
        }
    },

    deleteForm: async (req, res) => {
        try {
            const { id } = req.params;
            await newsApi.delete(`/campaigns/${id}`);

            return _messages.successEmpty(
                res,
                req,
                'Formulário removido com sucesso',
                'news',
                'deleteForm'
            );
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;

            return _messages.internalServer(res, req, message, message, 'news', 'deleteForm');
        }
    },

    deleteFormMaterial: async (req, res) => {
        try {
            const { id } = req.params;
            await newsApi.delete(`/campaigns/${id}/material`);

            return _messages.successEmpty(
                res,
                req,
                'Formulário removido com sucesso',
                'news',
                'deleteFormMaterial'
            );
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;

            return _messages.internalServer(
                res,
                req,
                message,
                message,
                'news',
                'deleteFormMaterial'
            );
        }
    },

    deleteCampaign: async (req, res) => {
        try {
            const { id } = req.params;
            await newsApi.delete(`/campaigns/${id}`);

            return _messages.successEmpty(
                res,
                req,
                'Campanha removida com sucesso',
                'news',
                'deleteCampaign'
            );
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;

            return _messages.internalServer(res, req, message, message, 'news', 'deleteCampaign');
        }
    },
};

module.exports = campaignsController;
