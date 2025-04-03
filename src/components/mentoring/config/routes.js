const express = require('express');
const _controller = require('./controller');

module.exports = express
    .Router()
    .get('/', _controller.findByClientId)
    .post('/', _controller.createConfig)
