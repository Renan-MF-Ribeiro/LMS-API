const express = require('express');
const _controller = require('./controller');

module.exports = express
    .Router()
    .post('/', _controller.create)
    .patch('/:id', _controller.update)
    .get('/', _controller.list)
