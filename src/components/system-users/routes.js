const express = require('express');
const _controller = require('./controller');
const { isAdmin } = require('../../utils/middlewares');

module.exports = express
    .Router()
    .get('/', isAdmin, _controller.getActive)
    .get('/generate', isAdmin, _controller.generate);
