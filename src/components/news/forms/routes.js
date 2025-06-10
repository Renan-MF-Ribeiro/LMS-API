const express = require('express');
const _controller = require('./controller');
const formidable = require('express-formidable');
const { isMongoId } = require('../../../utils/middlewares');

module.exports = express
    .Router()
    .get('/:id', isMongoId, _controller.getForm)
    .get('/', _controller.listForms)
    .post('/', formidable(), _controller.createOrUpdateForm)
    .put('/:id', isMongoId, formidable(), _controller.createOrUpdateForm)
    .delete('/:id', isMongoId, _controller.deleteForm)
    .delete('/:id/material', isMongoId, _controller.deleteFormMaterial);
