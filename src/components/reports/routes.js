const express = require('express')
const router = express.Router()
const _controller = require('./controller')

router
    .get('/', _controller.findAll)

module.exports = router
