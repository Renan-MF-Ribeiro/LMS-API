const express = require('express');
const _controller = require('./controller');

module.exports = express
    .Router()
    .post('/', _controller.create)
    .patch('/:id', _controller.update)
    .get('/', _controller.list)
    .get('/:id', _controller.findMeetingById)
    .post('/feedback/:id', _controller.sendFeedback)
    .post('/comment/:id', _controller.sendComment)
    .post('/delete/:id', _controller.deleteMeeting)
    .get('/comment/:id', _controller.listCommentsByMeeting)
    .get('/mentor/:id', _controller.findMeetingsByMentorId)
    .get('/mentor/:id/futuremeetings', _controller.findFutureMeetingsByMentorId)
    .get('/mentee/me/futuremeetings', _controller.findMyMenteeFutureMeetings)
    .get('/recordMentee/:mentorId/:menteeId', _controller.getRecordMentee); 
