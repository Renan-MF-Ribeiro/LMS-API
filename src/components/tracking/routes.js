const express = require('express')
const _controller = require('./controller')

const { isAdmin } = require('../../utils/middlewares')

module.exports = express.Router()
    .put('/', _controller.createOrUpdate)
    .get('/', _controller.list)
    .delete('/', isAdmin, _controller.deleteQuery)

    .get('/start', _controller.findOrCreate)

    .put('/doc', _controller.createOrUpdateDocument)
    .put('/media', _controller.createOrUpdateMedia)
    .put('/scorm', _controller.createOrUpdateSCORM)
