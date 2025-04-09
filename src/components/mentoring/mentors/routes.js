const express = require('express');
const _controller = require('./controller');

module.exports = express
    .Router()
    .get('/me', _controller.findMyProfile)
    .get('/calendar/:mentorId', _controller.getMentorCalendar)
    .post('/', _controller.create)
    .get('search', _controller.searchMentors)
