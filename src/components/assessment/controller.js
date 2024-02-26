const axios = require('axios');
const _messages = require('../../utils/messages');
const { getUserByToken } = require('../../utils/functions');

const host = process.env.API_ASSESSMENT;
const clientId = process.env.CLIENT_ID;
const headers = { 'x-client-key': process.env.API_KEY_ASSESSMENT };

const AssessmentController = {
    async listPillars(req, res) {
        try {
            const uri = `${host}/pillars/${clientId}`;
            const { data } = await axios.get(uri, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async createPillar(req, res) {
        try {
            const uri = `${host}/pillars/${clientId}`;
            const { data } = await axios.post(uri, req.body, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async updatePillar(req, res) {
        try {
            const uri = `${host}/pillars/${clientId}`;
            const { data } = await axios.post(uri, req.body, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async listCycles(req, res) {
        try {
            const uri = `${host}/cycles/${clientId}`;
            const { data } = await axios.get(uri, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async createCycle(req, res) {
        try {
            const uri = `${host}/cycles/${clientId}`;
            const { data } = await axios.post(uri, req.body, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async updateCycle(req, res) {
        try {
            const uri = `${host}/cycles/${clientId}`;
            const { data } = await axios.post(uri, req.body, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async listClientMatrices(req, res) {
        try {
            const uri = `${host}/matrix/${clientId}`;
            console.log({ uri });
            const { data } = await axios.get(uri, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async createMatrix(req, res) {
        try {
            const uri = `${host}/matrix`;

            const { data } = await axios.post(
                uri,
                { ...req.body, clientId },
                { headers }
            );

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async updateMatrixPeriod(req, res) {
        try {
            const uri = `${host}/matrix/update-period/${matrixId}/${periodId}`;

            const body = {
                periodId,
                xWeights: req.body.xWeights,
                yWeights: req.body.yWeights,
            };

            const { data } = await axios.patch(uri, body, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async softDeleteMatrix(req, res) {
        try {
            const { id } = req.params;

            const uri = `${host}/matrix/${id}`;

            const { data } = await axios.delete(uri, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },
};

function handleError(res, req, error) {
    const status = error?.response?.status;
    if (!status)
        return _messages.internalServer(res, req, error, error.response?.data);

    switch (status) {
        case 400: {
            return _messages.badRequest(res, req, error, error.response.data);
        }

        case 403: {
            return _messages.forbidden(res, req, error, error.response.data);
        }

        case 404: {
            return _messages.notFound(res, req, error, error.response.data);
        }

        case 409: {
            return _messages.conflict(res, req, error, error.response.data);
        }

        default: {
            return _messages.internalServer(
                res,
                req,
                error,
                error.response?.data
            );
        }
    }
}

module.exports = AssessmentController;
