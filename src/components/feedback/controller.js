const axios = require('axios');
const _messages = require('../../utils/messages');
const { CLIENT_ID, API_SURVEY } = process.env;

const getHeaders = (req) => ({
    Authorization: `Bearer ${req.headers.authorization}`
});

module.exports = {
    async saveSurvey(req, res) {
        try {
            const answer = req.body.feedbacks[0].answer;
            if (!answer) {
                return _messages.badRequest(res, req, 'Campo "answer" é obrigatório', 'Campo "answer" é obrigatório', 'survey', 'saveSurvey');
            }

            const { data } = await axios.post(
                `${API_SURVEY}/feedback/save`,
                { ...req.body, clientid: CLIENT_ID },
                { headers: getHeaders(req) }
            );

            _messages.success(res, req, data, 'ok', 'survey', 'saveSurvey');
        } catch (error) {
            _messages.badRequest(res, req, 'Operação inválida', error.message, 'survey', 'saveSurvey');
        }
    },

    async updateSurvey(req, res) {
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

    async listByUser(req, res) {
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