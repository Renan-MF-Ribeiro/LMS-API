const _messages = require('../../utils/messages');
const _events = require('./events/controller')
const { handleError } = require('../../utils/errors');
const { getUserByToken } = require('../../utils/functions');
const { EVENT_TYPE } = require("./events/model");
const { returnContentConcludedOrRevoked, returnContentCourses } = require('./business')

const CalendarController = {
    async getCalendarEvents(req, res) {
        try {
            const { _id, networkLogin } = await getUserByToken(req);
            const { start, end } = req.query
            let events = await _events.getCalendarEventsByDate(start, end, _id)

            for (let event of events) {
                if (event.type === EVENT_TYPE.COURSE) {
                   event.content = await returnContentCourses(event.classId, _id)
                } else {
                   event.content = await returnContentConcludedOrRevoked(event.trailId, networkLogin)
                }
            }

            return _messages.success(res, req, events);
        } catch (error) {
            return handleError(res, req, error)
        }
    }
};

module.exports = CalendarController;
