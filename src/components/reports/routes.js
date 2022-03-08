const express = require('express')
const router = express.Router()
const _controller = require('./controller')

module.exports = express.Router()
    .get('/', _controller.getHealthStatus)
    .get('/details', _controller.getHealthStatusWithDetails)
