const express = require('express');
const _controller = require('./controller');
const formidable = require('express-formidable');

module.exports = express
    .Router()
    .get('/', _controller.getAllAvatars)
    .get('/:id', _controller.findAvatar)
    .post('/', formidable(), _controller.createAvatar)
    .put('/:id', formidable(), _controller.updateAvatar)
    .delete('/:id', _controller.deleteAvatar);
