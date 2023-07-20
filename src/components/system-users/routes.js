const express = require('express')
const _controller = require('./controller')
const { isAdmin } = require('../../utils/middlewares')

module.exports = express
    .Router()
    .post('/generate', isAdmin, _controller.generate)
    .get('/active', isAdmin, _controller.getActive)
