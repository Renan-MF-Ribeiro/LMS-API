const { newsApi } = require('../http-adapter');

const formsController = {
    getForm: async (req, res) => {
        try {
            const { id } = req.params;
            const { data } = await newsApi.get(`/forms/${id}`);

            res.json(data);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';

            res.status(statusCode).json(errorMessage);
        }
    },

    listForms: async (req, res) => {
        try {
            const options = req.query;
            const { data } = await newsApi.get('/forms', { params: options });

            res.json(data);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';

            res.status(statusCode).json(errorMessage);
        }
    },

    createForm: async (req, res) => {
        try {
            const { data } = await newsApi.post('/forms', req.body);

            res.json(data);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';

            res.status(statusCode).json(errorMessage);
        }
    },

    updateForm: async (req, res) => {
        try {
            const { id } = req.params;
            const { data } = await newsApi.put(`/forms/${id}`, req.body);

            res.json(data);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';

            res.status(statusCode).json(errorMessage);
        }
    },
};

module.exports = formsController;
