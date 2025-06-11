require('dotenv').config();
const _messages = require('../../../utils/messages');
const { newsApi } = require('../http-adapter');
const { azureBlob } = require('../../../utils/files');

module.exports = {
    async list(req, res) {
        try {
            const { data } = await newsApi.get(`/categories/list`);

            _messages.success(res, req, data);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno do servidor',
                'trails',
                'createPadlet'
            );
        }
    },

    async getById(req, res) {
        try {
            const { data } = await newsApi.get(`/categories/${req.params.id}`);

            _messages.success(res, req, data);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno do servidor',
                'trails',
                'createPadlet'
            );
        }
    },

    async home(req, res) {
        try {
            const { data } = await newsApi.get(`/home/categories/${req.params.id}`);

            _messages.success(res, req, data);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno do servidor',
                'trails',
                'createPadlet'
            );
        }
    },

    async create(req, res) {
        const payload = JSON.parse(req.fields.payload);

        const { thumb } = req.files;
        if (thumb) {
            const thumbPath = await azureBlob(thumb, 'news/banners');

            payload.thumbPath = thumbPath;
        }

        try {
            const { data } = await newsApi.post(`/categories/create`, payload);
            return _messages.success(res, req, data, 'ok', 'news', 'category created successfully');
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno do servidor',
                'trails',
                'createPadlet'
            );
        }
    },

    async update(req, res) {
        const { title, news, enabled, id } = req.fields;
        const { banner } = req.files;

        let thumbPath;

        if (banner) {
            thumbPath = await azureBlob(banner, 'news/banners');
        }

        const body = {
            title,
            news: JSON.parse(news),
            enabled: enabled === 'true' ? true : false,
            thumbPath,
        };

        try {
            const { data } = await newsApi.put(`/categories/${id}`, body);
            return _messages.success(res, req, data, 'ok', 'news', 'category updated successfully');
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno do servidor',
                'trails',
                'createPadlet'
            );
        }
    },
};
