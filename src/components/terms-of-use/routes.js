const express = require('express')
const router = express.Router()
const _controller = require('./controller')
const { isAdmin } = require('../../utils/middlewares')

router
    .get('/', isAdmin, _controller.list)
    .post('/', isAdmin, _controller.create)
    .get('/last', _controller.getLast)

module.exports = router
