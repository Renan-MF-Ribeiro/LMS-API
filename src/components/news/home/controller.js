const _messages = require('../../../utils/messages');
const { newsApi } = require('../http-adapter');
const { azureBlob } = require('../../../utils/files');
const moment = require('moment');
const { getConnectMap } = require('../../../utils/connect');
const { getUserByToken } = require('../../../utils/functions');
const { User } = require('../../users/model');

const campaignsController = {
    getNews: async (req, res) => {
        try {
            const { id } = req.params;
            const { data } = await newsApi.get(`/home/${id}`);

            if (data?.users) {
                const users = await User.find({ _id: { $in: data.users } });
                const { data: config } = await newsApi.get('/config');

                if (config.enableUserLink && config?.userFields) {
                    data.users = users.map((user) =>
                        config.userFields.reduce((obj, field) => {
                            obj[field] = user[field];
                            return obj;
                        }, {})
                    );
                }
            }

            return _messages.success(res, req, data, 'ok', 'news', 'getNews');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;

            return _messages.internalServer(res, req, message, message, 'news', 'getNews');
        }
    },

    listNews: async (req, res) => {
        try {
            const options = req.query;
            const { data: listNews } = await newsApi.get('/home', { params: options });
            const { data: config } = await newsApi.get('/config');

            const news = [];

            if (listNews?.data?.some((news) => (news?.users || []).length > 0)) {
                for (const newsData of listNews.data) {
                    const populatedNews = { ...newsData };

                    if (newsData?.users) {
                        const users = await User.find({ _id: { $in: newsData.users } });

                        populatedNews.users = users.map((user) => {
                            const base = { _id: user._id, name: user.name };

                            if (config.enableUserLink && config?.userFields?.length) {
                                const extraFields = config.userFields.reduce((acc, field) => {
                                    acc[field] = user[field];
                                    return acc;
                                }, {});
                                return { ...base, ...extraFields };
                            }

                            return base;
                        });
                    }
                    news.push(populatedNews);
                }
            }

            const data = { data: news, total: listNews.total };

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

    getFormByCampaignId: async (req, res) => {
        try {
            const { campaignId } = req.params;
            const options = req.query;

            const { data } = await newsApi.get(`/home/forms/${campaignId}`, { params: options });

            return _messages.success(res, req, data, 'ok', 'news', 'getFormByCampaignId');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;

            return _messages.internalServer(
                res,
                req,
                message,
                message,
                'news',
                'getFormByCampaignId'
            );
        }
    },

    createNews: async (req, res) => {
        try {
            const payload = JSON.parse(req.fields.payload);

            const { thumb } = req.files;
            if (thumb) {
                const thumbPath = await azureBlob(thumb, 'news/banners');

                payload.thumbPath = thumbPath;
            }
            const { data } = await newsApi.post('/news', payload);

            return _messages.success(res, req, data, 'ok', 'news', 'createNews');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;

            return _messages.internalServer(res, req, message, message, 'news', 'createNews');
        }
    },

    updateNews: async (req, res) => {
        try {
            const { id } = req.params;
            const payload = JSON.parse(req.fields.payload);

            const { thumb } = req.files;
            if (thumb) {
                const thumbPath = await azureBlob(thumb, 'news/banners');

                payload.thumbPath = thumbPath;
            }

            const { data } = await newsApi.put(`/news/${id}`, payload);

            return _messages.success(res, req, data, 'ok', 'news', 'updateNews');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;

            return _messages.internalServer(res, req, message, message, 'news', 'updateNews');
        }
    },
};

module.exports = campaignsController;
