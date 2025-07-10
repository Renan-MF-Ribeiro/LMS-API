const express = require('express');
const _controller = require('./controller');

module.exports = express
    .Router()
    .get('/', _controller.findManagedUsers)
    .get('/:id', _controller.findUserById)
    .get('/:id/certifiers', _controller.findUserCertifiers)
    .get('/:id/concluded-courses', _controller.findUsersConcludedCourses)
    .get('/:id/suggestions', _controller.findSuggestedContent)
    .post('/suggest-content', _controller.suggestContent)
    