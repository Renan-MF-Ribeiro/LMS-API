const { processApi } = require('./http-adapter');
const { azureBlob } = require('../../utils/files');
const business = require('./business');

const processController = {
    findAllPaginated: async (req, res) => {
        try {
            const options = req.query;
            const { data } = await processApi.get('/process/', {
                params: options,
            });

            res.status(data.statusCode).json(data.data);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    findOne: async (req, res) => {
        try {
            const { id } = req.params;
            const { data } = await processApi.get(`/process/${id}`);
            res.status(data.statusCode).json(data.data);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    getStatus: async (req, res) => {
        try {
            const options = req.query;
            const { data } = await processApi.get(`/process/status`, {
                params: options,
            });
            res.status(data.statusCode).json(data.data);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    // Manual trigger for testing
    generateRecords: async (req, res) => {
        try {
            const id = req.params.id;
            const { data } = await processApi.get(`/process/generate-records/${id}`,);
            res.status(data.statusCode).json(data.data);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    // Manual trigger for testing
    reprocessResult: async (req, res) => {
        try {
            const id = req.params.id;
            await processApi.get(`/process/reprocess-result/${id}`,);
            res.status(204).json("Done")
        } catch (error) {
            console.log(error)
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },


    create: async (req, res) => {
        const body = req.fields?.payload ? JSON.parse(req.fields?.payload) : req.body;
        //const body = req.fields ? req.fields : req.body;
        const file = req.files?.file

        if (file) {
            const fileName = business.normalize(body.identifier)
            const originalUrl = await azureBlob(file, `process/${fileName}/files`)
            body.file = {
                size: file.size,
                originalUrl,
                name: file.name
            };
        }

        try {
            const { data } = await processApi.post('/process', body);

            if (data?.data?._id) {
                const message = data?.data?._id
                await business.sendKafkaMessage(message)
            }
            res.status(data.statusCode).json(data.data);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    delete: async (req, res) => {
        try {
            const id = req.params?.id;

            const { data } = await processApi.delete(`/process/${id}`, req.body);
            res.status(data.statusCode).json(data.data);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },
};

module.exports = processController;
