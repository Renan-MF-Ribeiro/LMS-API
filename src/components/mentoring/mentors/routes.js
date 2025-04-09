const express = require('express');
const _controller = require('./controller');

module.exports = express
    .Router()
    .get('/profile/', _controller.findMentorProfile)
    .get('/profile/:param', _controller.findMentorProfile)
    .get('/calendar/:mentorId', _controller.getMentorCalendar)
    .post('/', _controller.create)
