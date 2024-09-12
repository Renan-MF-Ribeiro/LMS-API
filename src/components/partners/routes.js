const express = require('express');
const _controller = require('./controller');
const formidable = require('express-formidable');

module.exports = express
    .Router()
    .post('/', formidable(), _controller.create)
    .put('/:id', formidable(), _controller.update)
    .delete('/:id', _controller.delete)
    .get('/', _controller.getParterners)
    .get('/active', _controller.getActivePartners);
