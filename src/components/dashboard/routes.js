const express = require('express')
const router = express.Router()
const _controller = require('./controller')
const { isAdmin } = require('../../utils/middlewares')

router
    .get('/list', isAdmin, _controller.list)
    .post('/create', isAdmin, _controller.create)
    .put('/update', isAdmin, _controller.update)
    .post('/delete', isAdmin, _controller.delete)

module.exports = router
