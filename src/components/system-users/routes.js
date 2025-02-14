const express = require('express');
const _controller = require('./controller');
const { isSuperAdmin } = require('../../utils/middlewares');

module.exports = express
    .Router()
    .get('/', isSuperAdmin, _controller.getActive)
    .post('/generate', isSuperAdmin, _controller.generate);
