const express = require('express');
const _controller = require('./controller');
const formidable = require('express-formidable');

module.exports = express
    .Router()
    .get('/', _controller.findAllPaginated)
    .get('/status', _controller.getStatus)
    .get('/:id', _controller.findOne)

    //.get('/user/:id', _controller.findByUserId)

    .post('/', _controller.create)
    .delete('/:id', _controller.delete);
