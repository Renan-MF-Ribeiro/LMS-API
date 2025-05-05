const express = require('express');
const _controller = require('./controller');
const formidable = require('express-formidable');

module.exports = express
    .Router()
    .get('/', _controller.findByClientId)
    .get('/integration', _controller.findIntegrationByClientId)
    .post('/integration', _controller.integrationConfig)
    .post('/', formidable(), _controller.createConfig)
    .get('/home', _controller.home)
    .get('/blocked-users', _controller.getBlockedUsers)
