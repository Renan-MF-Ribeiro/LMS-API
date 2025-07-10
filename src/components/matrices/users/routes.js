const express = require('express');
const _controller = require('./controller');
const { isMatrixModuleActive } = require('../../../utils/middlewares');

module.exports = express
    .Router()
    .get('/', _controller.findAll)
    .get('/find', _controller.findByRegistrationOrName)
    .get('/:id/matrices', isMatrixModuleActive, _controller.findUsersMatrices)
    .get('/:userId/matrix/:matrixId', isMatrixModuleActive, _controller.findCategoriesToRelease)
    .get('/:id/evaluations-result', isMatrixModuleActive, _controller.findUsersEvaluationsResultSuggestions)
    .get('/:id/suggestions', _controller.findSuggestedContent)
    .get('/:id', _controller.findOne)
    .post('/', _controller.create)
    .post('/suggest-content', _controller.suggestContent)
    .put('/:id', _controller.update)
    .delete('/:id', _controller.delete);
