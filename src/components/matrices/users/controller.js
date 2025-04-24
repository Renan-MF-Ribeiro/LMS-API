const { matricesApi } = require('../http-adapter');

const usersController = {
    findAll: async (req, res) => {
        try {
            const options = req.query;
            const { data } = await matricesApi.get('/users', { params: options });

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
            const { data } = await matricesApi.get(`/users/${id}`);
            res.status(data.statusCode).json(data.data);
        } catch (error) {
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = error.response?.data?.message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    create: async (req, res) => {
        try {
            const { data } = await matricesApi.post('/users', req.body);
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

            const { data } = await matricesApi.patch(`/users/${id}`, req.body);
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

            const { data } = await matricesApi.delete(`/users/${id}`, req.body);
            res.status(data.statusCode).json(data.data);
        } catch (error) {
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = error.response?.data?.message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },
};

module.exports = usersController;
