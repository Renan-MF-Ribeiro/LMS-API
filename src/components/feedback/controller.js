const axios = require('axios');
const { CLIENT_ID, API_SURVEY } = process.env;

module.exports = {
    async saveSurvey (req, res) {
        try {
            const { data } = await axios.post(
                `${API_SURVEY}/feedback/save`,
                { ...req.body, clientId: CLIENT_ID },
                { headers: getHeaders(req) }
            );

            _messages.success(res, req, data, 'ok', 'survey', 'saveSurvey');
        } catch (error) {
            _messages.badRequest(res, req, 'Operação inválida', error.message, 'survey', 'saveSurvey');
        }
    },

    async updateSurvey (req, res) {
        try {
            const { data } = await axios.post(
                `${API_SURVEY}/updateSurvey`,
                { ...req.body, clientId: CLIENT_ID },
                { headers: getHeaders(req) }
            );

            _messages.success(res, req, data, 'ok', 'survey', 'updateSurvey');
        } catch (error) {
            _messages.badRequest(res, req, 'Operação inválida', error.message, 'survey', 'updateSurvey');
        }
    },

    async listByUser (req, res) {
        try {
            const { data } = await axios.get(
                `${API_SURVEY}/listbyuser`,
                { headers: getHeaders(req), params: { ...req.query, clientId: CLIENT_ID } }
            );

            _messages.success(res, req, data, 'ok', 'survey', 'listByUser');
        } catch (error) {
            _messages.badRequest(res, req, 'Operação inválida', error.message, 'survey', 'listByUser');
        }
    }


}