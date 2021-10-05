const express = require('express')
const router = express.Router()
const _controller = require('./controller')
const {
    isAdmin,
} = require('../../utils/middlewares')
router
    .post('/create', isAdmin, _controller.createMessages)
    .get('/', isAdmin, _controller.getMessages)

module.exports = router
