const express = require('express');
const _controller = require('./controller');
const formidable = require('express-formidable');

module.exports = express
    .Router()
    .post('/', formidable(), _controller.create)
    .put('/:id', formidable(), _controller.update)
    .put('/:id/change-status', _controller.updateStatus)
    .delete('/:id', _controller.delete)
    .get('/', _controller.getPartners)
    .get('/active', _controller.getActivePartners)
    .get('/token', _controller.getPartnersByToken);
