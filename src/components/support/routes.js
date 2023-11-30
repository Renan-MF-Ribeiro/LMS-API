const express = require('express')
const _controller = require('./controller')
const formidable = require('express-formidable');

module.exports = express.Router()
    .post('/', formidable(), _controller.create)
