const express = require('express')
const _controller = require('./controller')

module.exports = express.Router()
    .get('/list', _controller.create)
    .post('/create', _controller.create)