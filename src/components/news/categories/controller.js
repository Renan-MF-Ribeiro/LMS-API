require('dotenv').config();
const _messages = require('../../../utils/messages');
const { newsApi } = require('../http-adapter');
const { azureBlob } = require('../../../utils/files');
const { getUserByToken } = require('../../../utils/functions');


module.exports = {
    async list(req, res) {
        try {
            const options = req.query;
            const { data } = await newsApi.get(`/categories/list`, { params: options });

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

    //listar categorias pro front > regras : flag de campanha ativa ? listar categorias com capanha e usuario tem campo da carga valido : listar todas as categorias da campanha.

    async getCategoriesByCampaing(req, res) {
        try {

            const user = await getUserByToken(req);
            const { data } = await newsApi.get(`/categories/valid/${req.params.id}`);
            const categories = []

            if (data.allowOutsideUsersToPost) {
                return { data: data.categories, total: data.categories.length };
            }

            for (let category of data.categories) {
                if (category.audiences && category.audiences.length > 0) {
                    if (user && category.audiences && category.audiences.length > 0) {
                        const hasValidAudience = category.audiences.some(audience => {
                            const userValue = user[audience.field];
                            return userValue && userValue === audience.value;
                        });

                        if (hasValidAudience) {
                            categories.push(category);
                        }
                    }
                } else {
                    categories.push(category);
                }
            }


            _messages.success(res, req, { data: categories, total: categories.length });
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
        const payload = JSON.parse(req.fields.payload);
        const { thumb } = req.files;

        let thumbPath;

        if (thumb) {
            thumbPath = await azureBlob(banner, 'news/banners');
        }

        try {
            const { data } = await newsApi.put(`/categories/${req.params.id}`, {
                ...payload,
                thumbPath,
            });
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

    deleteCategory: async (req, res) => {
        try {
            const { id } = req.params;
            await newsApi.delete(`/categories/${id}`);

            return _messages.successEmpty(
                res,
                req,
                'Categoria removida com sucesso',
                'news',
                'deleteCategory'
            );
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;

            return _messages.internalServer(res, req, message, message, 'news', 'deleteCategory');
        }
    },
};
