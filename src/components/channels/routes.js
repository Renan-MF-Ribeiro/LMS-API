const express = require('express')
const router = express.Router()
const _controller = require('./controller')
const formidable = require('express-formidable')

router
    .get('/', _controller.getChannels)
    .get('/elegibles', _controller.getChannelsElegibles)
    .post('/', formidable(), _controller.create)
    .put('/', formidable(), _controller.update)
    .delete('/:id', _controller.delete)

module.exports = router
