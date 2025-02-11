const express = require('express');
const _controller = require('./controller');

module.exports = express
    .Router()
    // Rotas de Admin
    .get('/', _controller.getClientFeedConfig)
    .get('/can-post', _controller.userCanPost)
    .post('/', _controller.createOrUpdateConfig)
    
