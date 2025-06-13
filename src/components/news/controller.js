const _messages = require('../../utils/messages');
const { azureBlob } = require('../../utils/files');
const { User } = require('../users/model');
const { newsApi } = require('./http-adapter');

const newsController = {
    getNews: async (req, res) => {
        try {
            const { id } = req.params;
            const { data } = await newsApi.get(`/news/${id}`);

            return _messages.success(
                res,
                req,
                data,
                'Notícia retornada com sucesso',
                'news',
                'getNews'
            );
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;

            return _messages.internalServer(res, req, message, message, 'news', 'getNews');
        }
    },

    listNews: async (req, res) => {
        try {
            const options = req.query;
            const { data: listNews } = await newsApi.get('/news', { params: options });
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

            const data = { data: news, total: data.total };

            return _messages.success(
                res,
                req,
                data,
                'Notícia criada com sucesso',
                'news',
                'listNews'
            );
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;

            return _messages.internalServer(res, req, message, message, 'news', 'listNews');
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

            return _messages.success(
                res,
                req,
                data,
                'Notícia criada com sucesso',
                'news',
                'createNews'
            );
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;

            return _messages.internalServer(res, req, message, message, 'news', 'createNews');
        }
    },

    updateNews: async (req, res) => {
        try {
            const { id } = req.params;
            const { data } = await newsApi.put(`/news/${id}`, req.body);

            return _messages.success(
                res,
                req,
                data,
                'Notícia atualizada com sucesso',
                'news',
                'updateNews'
            );
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;

            return _messages.internalServer(res, req, message, message, 'news', 'updateNews');
        }
    },

    deleteNews: async (req, res) => {
        try {
            const { id } = req.params;
            await newsApi.delete(`/news/${id}`);

            return _messages.successEmpty(
                res,
                req,
                'Notícia removida com sucesso',
                'news',
                'deleteNews'
            );
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;

            return _messages.internalServer(res, req, message, message, 'news', 'deleteNews');
        }
    },
};

module.exports = newsController;
