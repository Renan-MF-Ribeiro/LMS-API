const express = require('express');
const _controller = require('./controller');

module.exports = express
    .Router()
    .get('/profile/', _controller.findMentorProfile)
    .get('/historic/', _controller.findCompletedMentorings)

    .get('/profile/:param', _controller.findMentorProfile)
    .get('/historic/:param', _controller.findCompletedMentorings)

    .get('/calendar/:mentorId', _controller.getMentorCalendar)
    .post('/', _controller.create)
    .get('/search', _controller.searchMentors)
    .get('/', _controller.findAll)
