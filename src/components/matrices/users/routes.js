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
    .get('/:id/suggestions', isMatrixModuleActive, _controller.findSuggestedContent)
    .get('/:id', isMatrixModuleActive, _controller.findOne)
    .post('/', isMatrixModuleActive, _controller.create)
    .post('/suggest-content', _controller.suggestContent)
    .put('/:id', isMatrixModuleActive, _controller.update)
    .delete('/:id', isMatrixModuleActive, _controller.delete);
