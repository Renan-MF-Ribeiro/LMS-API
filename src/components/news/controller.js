const { azureBlob } = require('../../utils/files');
const { User } = require('../users/model');
const { newsApi } = require('./http-adapter');

const newsController = {
    getNews: async (req, res) => {
        try {
            const { id } = req.params;
            const { data } = await newsApi.get(`/news/${id}`);

            res.json(data);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';

            res.status(statusCode).json(errorMessage);
        }
    },

    listNews: async (req, res) => {
        try {
            const options = req.query;
            const { data } = await newsApi.get('/news', { params: options });

            const news = [];

            if (data?.data?.some((news) => (news?.users || []).length > 0)) {
                for (const newsData of data.data) {
                    const populatedNews = newsData;
                    if (newsData?.users) {
                        const users = await User.find({ _id: { $in: newsData.users } });
                        populatedNews.users = users.map((user) => ({
                            _id: user._id,
                            name: user.name,
                        }));
                    }
                    news.push(populatedNews);
                }
            }

            res.json(data);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';

            res.status(statusCode).json(errorMessage);
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

            res.json(data);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';

            res.status(statusCode).json(errorMessage);
        }
    },

    updateNews: async (req, res) => {
        try {
            const { id } = req.params;
            const { data } = await newsApi.put(`/news/${id}`, req.body);

            res.json(data);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';

            res.status(statusCode).json(errorMessage);
        }
    },
};

module.exports = newsController;
