const _messages = require('../../../utils/messages');
const { newsApi } = require('../http-adapter');
const { azureBlob } = require('../../../utils/files');

const formsController = {
    getForm: async (req, res) => {
        try {
            const { id } = req.params;
            const { data } = await newsApi.get(`/forms/${id}`);

            return _messages.success(res, req, data, 'ok', 'news', 'getForm');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;

            return _messages.internalServer(res, req, message, message, 'news', 'getForm');
        }
    },

    listForms: async (req, res) => {
        try {
            const options = req.query;
            const { data } = await newsApi.get('/forms', { params: options });

            return _messages.success(res, req, data, 'ok', 'news', 'listForms');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;

            return _messages.internalServer(res, req, message, message, 'news', 'listForms');
        }
    },

    createOrUpdateForm: async (req, res) => {
        try {
            const { introduction, isDefault, name, labels = '{}' } = req.fields;
            const payload = {
                introduction,
                isDefault,
                name,
                labels: JSON.parse(labels),
            };

            let { material } = req.files;

            let id = req?.params?.id;
            if (!id) {
                const response = await newsApi.post('/forms', payload);
                id = response.data._id.toString();

                if (!material) {
                    return res.json(response.data);
                }
            }

            if (material) {
                const fileName = material.name.split('.');
                const url = await azureBlob(material, 'news/materials');
                payload.material = {
                    title: fileName[0],
                    url,
                };
            }

            const response = await newsApi.put(`/forms/${id}`, payload);

            return _messages.success(res, req, response.data, 'ok', 'news', 'createOrUpdateForm');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;

            return _messages.internalServer(
                res,
                req,
                message,
                message,
                'news',
                'createOrUpdateForm'
            );
        }
    },

    deleteForm: async (req, res) => {
        try {
            const { id } = req.params;
            await newsApi.delete(`/forms/${id}`);

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
            await newsApi.delete(`/forms/${id}/material`);

            return _messages.successEmpty(
                res,
                req,
                'Formulário removido com sucesso',
                'news',
                'deleteForm'
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
};

module.exports = formsController;
