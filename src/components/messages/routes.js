const express = require('express')
const router = express.Router()
const _controller = require('./controller')
const formidable = require('express-formidable')

router
    .post('/create', _controller.createMessages)

module.exports = router
