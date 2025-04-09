const express = require('express');
const _controller = require('./controller');

module.exports = express
    .Router()
    .post('/', _controller.create)
    .post('/feedback/:id', _controller.sendFeedback)
    .patch('/:id', _controller.update)
    .get('/', _controller.list)
