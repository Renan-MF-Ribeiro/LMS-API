const express = require('express')
const router = express.Router()
const _controller = require('./controller')

module.exports = express.Router()
    .post('/attempt', _controller.attemptCourse)
    .post('/complete', _controller.completeCourse)
