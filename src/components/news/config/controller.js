const { newsApi } = require('../http-adapter');

const configController = {
    getConfig: async (req, res) => {
        try {
            const { data } = await newsApi.get('/config');

            res.json(data);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';

            res.status(statusCode).json(errorMessage);
        }
    },

    updateConfig: async (req, res) => {
        try {
            const { data } = await newsApi.put('/config', req.body);

            res.json(data);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';

            res.status(statusCode).json(errorMessage);
        }
    },
};

module.exports = configController;
