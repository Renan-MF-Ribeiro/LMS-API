const express = require('express')
const _controller = require('./controller')
const formidable = require('express-formidable')

module.exports = express.Router()
    .get('/list', _controller.list)
    .post('/create', formidable(), _controller.create)