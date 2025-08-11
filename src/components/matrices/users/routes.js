const express = require('express');
const _controller = require('./controller');
const { isMatrixModuleActive } = require('../../../utils/middlewares');

module.exports = express
    .Router()
    .get('/find', _controller.findByRegistrationOrName)
    .get('/:id/matrices', isMatrixModuleActive, _controller.findUsersMatrices)
    .get('/:userId/matrix/:matrixId', isMatrixModuleActive, _controller.findCategoriesToRelease)
    .get('/:id/evaluations-result', isMatrixModuleActive, _controller.findUsersEvaluationsResultSuggestions)
    .post('/', _controller.create)
    .post('/suggest-content', _controller.suggestContent)
    .put('/:id', _controller.update)
    .delete('/:id', _controller.delete);
