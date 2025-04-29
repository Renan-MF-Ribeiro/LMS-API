const express = require('express');
const _controller = require('./controller');

module.exports = express
    .Router()
    .get('/', _controller.findAll)
    .get('/:id/matrices', _controller.findUsersMatrices)
    .get('/:id', _controller.findOne)
    .post('/', _controller.create)
    .put('/:id', _controller.update)
    .delete('/:id', _controller.delete);
