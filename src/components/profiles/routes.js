const express = require('express')
const router = express.Router()
const _controller = require('./controller')

router
    .get('/', _controller.findAll)
    .post('/', _controller.create)

module.exports = router
