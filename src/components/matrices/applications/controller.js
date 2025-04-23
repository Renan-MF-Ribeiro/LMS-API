const { matricesApi } = require('../http-adapter');

const ApplicationsController = {
    findAll: async (req, res) => {
        try {
            const options = req.query;
            const { data } = await matricesApi.get('/applications', { params: options });
            res.status(data.statusCode).json(data.data);
        } catch (error) {
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = error.response?.data?.message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    findOne: async (req, res) => {
        try {
            const { id } = req.params;
            const { data } = await matricesApi.get(`/applications/${id}`);
            res.status(data.statusCode).json(data.data);
        } catch (error) {
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = error.response?.data?.message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    create: async (req, res) => {
        try {
            const { data } = await matricesApi.post('/applications', req.body);
            res.status(data.statusCode).json(data.data);
        } catch (error) {
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = error.response?.data?.message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    update: async (req, res) => {
        try {
            const id = req.params?.id;

            const { data } = await matricesApi.patch(`/applications/${id}`, req.body);
            res.status(data.statusCode).json(data.data);
        } catch (error) {
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = error.response?.data?.message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    delete: async (req, res) => {
        try {
            const id = req.params?.id;

            const { data } = await matricesApi.delete(`/applications/${id}`, req.body);
            res.status(data.statusCode).json(data.data);
        } catch (error) {
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = error.response?.data?.message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },
};

module.exports = ApplicationsController;
