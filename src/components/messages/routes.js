const express = require('express')
const router = express.Router()
const _controller = require('./controller')
const {
    isElegibilityManager,
} = require('../../utils/middlewares')
router
    .post('/create', isElegibilityManager, _controller.createMessages)
    .get('/', isElegibilityManager, _controller.getMessages)
    .get('/:id', isElegibilityManager, _controller.getMessageById)

module.exports = router
