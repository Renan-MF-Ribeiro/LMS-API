const express = require('express')
const router = express.Router()
const _controller = require('./controller')
const { isUserManager } = require('../../utils/middlewares')

router
    .get('/list', isUserManager, _controller.list)
    .post('/create', isUserManager, _controller.create)
    .put('/update', isUserManager, _controller.update)
    .post('/delete', isUserManager, _controller.delete)

module.exports = router
