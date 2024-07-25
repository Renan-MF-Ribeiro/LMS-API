const _messages = require('../../utils/messages');
const _events = require('./events/controller')
const { handleError } = require('../../utils/errors');
const { getUserByToken } = require('../../utils/functions');
const { getTagsElegiblesByToken } = require('../sections/business');
const { EVENT_TYPE } = require("./events/model");
const { returnContentConclusion } = require('./business')

const CalendarController = {
    async getCalendarEvents(req, res) {
        try {
            const user = await getUserByToken(req);
            const tags = await getTagsElegiblesByToken(req);
            const { start, end } = req.query
            let events = await _events.getCalendarEventsByDate(start, end, user, tags, req.headers.authorization)
            for (let event of events) {
                if (event.type === EVENT_TYPE.CONCLUSION || event.type === EVENT_TYPE.CERTIFICATE || event.type === EVENT_TYPE.REVOKED) {
                    event.content = await returnContentConclusion(event.target.id, user.networkLogin)
                }
            }

            return _messages.success(res, req, events);
        } catch (error) {
            return handleError(res, req, error)
        }
    }
};

module.exports = CalendarController;
