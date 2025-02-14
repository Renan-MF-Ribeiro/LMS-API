const express = require('express');
const _controller = require('./controller');

module.exports = express
    .Router()
    .get('/', _controller.getClientFeedConfig)
    .get('/can-post', _controller.userCanPost)
    .post('/', _controller.createOrUpdateConfig)
    
