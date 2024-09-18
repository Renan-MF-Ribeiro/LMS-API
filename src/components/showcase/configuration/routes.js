const express = require('express')
const _controller = require('./controller')
const {
    validateTokenRoute,
} = require('../../../utils/middlewares')

module.exports = express.Router()
    .get('/', validateTokenRoute, _controller.getList)
    .get('/blocks', _controller.getBlocks)
    .get('/:id', _controller.getById)
    .post('/update-position', validateTokenRoute, _controller.orderChange)
    .put('/', validateTokenRoute, _controller.update)
    .put('/changeStatus', validateTokenRoute, _controller.changeStatus)
    .delete('/:id', _controller.delete)
