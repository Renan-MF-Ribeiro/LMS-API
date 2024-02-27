const axios = require('axios');
const _messages = require('../../utils/messages');
const { getUserByToken } = require('../../utils/functions');
const { handleError } = require('../../utils/errors');

const host = process.env.API_ASSESSMENT;
const clientId = process.env.CLIENT_ID;
const headers = { 'x-client-key': process.env.API_KEY_ASSESSMENT };

const AssessmentController = {
    async listPillars(req, res) {
        try {
            const searchParams = new URLSearchParams(req.query);
            const uri = `${host}/pillars/${clientId}?${searchParams}`;
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
            const { data } = await axios.put(uri, req.body, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async listCycles(req, res) {
        try {
            const searchParams = new URLSearchParams(req.query);
            const uri = `${host}/cycles/${clientId}?${searchParams}`;
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
            const { data } = await axios.put(uri, req.body, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    },

    async listClientMatrices(req, res) {
        try {
            const uri = `${host}/matrix/${clientId}`;
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

module.exports = AssessmentController;
