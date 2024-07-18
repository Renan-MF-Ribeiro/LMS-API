const express = require('express');
const router = express.Router();
const _controller = require('./controller');
const _eventController = require('./events/controller');

router
    .get('/', _controller.getCalendarEvents)
    .post('/event/create', _eventController.createCalendarEvent)
    .post('/event/remove', _eventController.removeCalendarEvent)
    .put('/event/update', _eventController.updateCalendarEvent)
module.exports = router;
