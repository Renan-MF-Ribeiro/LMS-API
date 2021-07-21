const express = require('express')
const router = express.Router()
const _controller = require('./controller')
const formidable = require('express-formidable')

router
    .get('/', _controller.list)
    .post('/import', formidable(), _controller.import)
    .delete('/delete', _controller.deleteAll)

module.exports = router
