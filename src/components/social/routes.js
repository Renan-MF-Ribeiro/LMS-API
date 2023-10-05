const express = require('express');
const _controller = require('./controller');
const { isAdmin } = require('../../utils/middlewares');

module.exports = express
    .Router()
    .get('/config', isAdmin, _controller.getConfig)
    .post('/config', isAdmin, _controller.postConfig);
