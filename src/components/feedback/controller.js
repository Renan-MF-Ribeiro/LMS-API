const axios = require('axios');
const _messages = require('../../utils/messages');
const GamificationKafka = require('../gamification/kafka/broker');
const { EVENT_CATEGORY } = require('../gamification/model');
const { CLIENT_ID, API_SURVEY } = process.env;

const getHeaders = (req) => ({
    Authorization: `Bearer ${req.headers.authorization}`
});

module.exports = {
    async saveSurvey (req, res) {
        try {
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

    async updateSurvey (req, res) {
        try {
            const { data } = await axios.post(
                `${API_SURVEY}/updatesurvey`,
                { ...req.body, clientid: CLIENT_ID },
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
                { headers: getHeaders(req), params: { ...req.query, clientid: CLIENT_ID } }
            );

            if (req?.query?.userid && req?.query?.item) {
                await GamificationKafka.publishEventRuleValidation({
                    events: [EVENT_CATEGORY.SURVEY, EVENT_CATEGORY.OPTIONAL_SURVEY],
                    identifier: req.query.userid,
                    meta: {
                        itemId: req.query.item,
                        survey: data,
                    },
                });
            }

            _messages.success(res, req, data, 'ok', 'survey', 'listByUser');
        } catch (error) {
            _messages.badRequest(res, req, 'Operação inválida', error.message, 'survey', 'listByUser');
        }
    }


}