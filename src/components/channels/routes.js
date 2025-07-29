const express = require('express')
const router = express.Router()
const _controller = require('./controller')
const formidable = require('express-formidable')
const { cacheRequestOnClient } = require('../../utils/cache/helpers')

router
    .get('/', _controller.getChannels)
    .get('/elegibles', cacheRequestOnClient(5 * 60 * 1000), _controller.getChannelsElegibles) // Cache for 5 minutes
    .post('/', formidable(), _controller.create)
    .put('/', formidable(), _controller.update)
    .delete('/:id', _controller.delete)
    .post('/update-position', _controller.updatePosition)

module.exports = router
