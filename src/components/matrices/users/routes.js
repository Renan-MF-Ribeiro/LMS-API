const express = require('express');
const _controller = require('./controller');

module.exports = express
    .Router()
    .get('/', _controller.findAll)
    .get('/find', _controller.findByRegistrationOrName)
    .get('/:id/matrices', _controller.findUsersMatrices)
    .get('/:userId/matrix/:matrixId', _controller.findCategoriesToRelease)
    .get('/:id/certifiers', _controller.findUserCertifiers)
    .get('/:id/evaluations-result', _controller.findUsersEvaluationsResultSuggestions)
    .get('/:id/suggestions', _controller.findSuggestedContent)
    .get('/:id/concluded-courses', _controller.findUsersConcluedCourses)
    .get('/:id', _controller.findOne)
    .post('/', _controller.create)
    .post('/suggest-content', _controller.suggestContent)
    .put('/:id', _controller.update)
    .delete('/:id', _controller.delete);
