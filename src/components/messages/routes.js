const express = require('express')
const router = express.Router()
const _controller = require('./controller')
const {
    isAdmin,
} = require('../../utils/middlewares')
router
    .post('/create', isAdmin, _controller.createMessages)
    .get('/', isAdmin, _controller.getMessages)
    .get('/:id', isAdmin, _controller.getMessageById)
    .post('/webPushMessage', _controller.webPushMessage)

module.exports = router
