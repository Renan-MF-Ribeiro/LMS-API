const _messages = require('../../../utils/messages');
const { newsApi } = require('../http-adapter');
const { azureBlob } = require('../../../utils/files');
const moment = require('moment');
const { getConnectMap } = require('../../../utils/connect');
const { getUserByToken } = require('../../../utils/functions');

const campaignsController = {
    listNews: async (req, res) => {
        try {
            const options = req.query;
            const { data } = await newsApi.get('/home', { params: options });

            return _messages.success(res, req, data, 'ok', 'news', 'listNews');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;

            return _messages.internalServer(res, req, message, message, 'news', 'listNews');
        }
    },

    listCampaigns: async (req, res) => {
        try {
            const user = await getUserByToken(req);

            const options = req.query;
            const { data: config } = await newsApi.get('/config');

            let allowedToPublish = false;
            if (config?.publishingRule) {
                allowedToPublish = config.publishingRule.values.includes(
                    user[config.publishingRule.field]
                );
            }

            const { data } = await newsApi.get('/home/campaigns', {
                params: { ...options, allowedToPublish },
            });

            return _messages.success(res, req, data, 'ok', 'news', 'listCampaigns');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;

            return _messages.internalServer(res, req, message, message, 'news', 'listCampaigns');
        }
    },
};

module.exports = campaignsController;
