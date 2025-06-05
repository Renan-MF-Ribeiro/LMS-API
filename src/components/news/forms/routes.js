const express = require('express');
const _controller = require('./controller');

module.exports = express
    .Router()
    .get('/:id', _controller.getForm)
    .get('/', _controller.listForms)
    .post('/', _controller.createForm)
    .put('/:id', _controller.updateForm);
