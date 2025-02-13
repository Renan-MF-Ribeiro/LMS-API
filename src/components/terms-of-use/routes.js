const express = require('express')
const router = express.Router()
const _controller = require('./controller')
const { validateTokenRoute, isAccountant } = require('../../utils/middlewares')

router
    .get('/', validateTokenRoute, isAccountant, _controller.list)
    .post('/', validateTokenRoute, isAccountant, _controller.create)
    .get('/last', _controller.getLast)

module.exports = router
