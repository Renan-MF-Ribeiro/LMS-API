const express = require('express');
const _controller = require('./controller');

module.exports = express
    .Router()
    .post('/', _controller.create)
    .put('/:id', _controller.update)
    .delete('/:id', _controller.delete)
    .get('/', _controller.getPartners)
    .get('/active', _controller.getActivePartners)
    .get('/token/:token', _controller.getTokenInfo);
