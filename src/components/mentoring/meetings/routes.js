const express = require('express');
const _controller = require('./controller');

module.exports = express
    .Router()
    .post('/', _controller.create)
    .post('/feedback/:id', _controller.sendFeedback)
    .patch('/:id', _controller.update)
    .get('/', _controller.list)
    .get('/:id', _controller.findMeetingById)
    .get('/mentor/:id/futuremeetings', _controller.findFutureMeetingsByMentorId)
    .get('/mentee/me/futuremeetings', _controller.findMyMenteeFutureMeetings)
