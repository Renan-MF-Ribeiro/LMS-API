const express = require('express');
const _controller = require('./controller');
const { cacheRequestOnClient } = require('../../../utils/cache/middlewares');

module.exports = express
    .Router()
    // Rotas de Admin
    .get('/', cacheRequestOnClient(), _controller.getClientFeedConfig)
    .get('/can-post', cacheRequestOnClient(), _controller.userCanPost)
    .post('/', _controller.createOrUpdateConfig)

