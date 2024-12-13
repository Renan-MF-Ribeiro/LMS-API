const express = require('express')
const router = express.Router()
const _controller = require('./controller')
const { isAdmin, validateTokenRoute } = require('../../utils/middlewares')

router
    .get('/', validateTokenRoute, isAdmin, _controller.list)
    .post('/', validateTokenRoute, isAdmin, _controller.create)
    .get('/last', _controller.getLast)

module.exports = router
