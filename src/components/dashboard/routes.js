const express = require('express')
const router = express.Router()
const _controller = require('./controller')
const { isSuperAdminOrAnalyst } = require('../../utils/middlewares')

router
    .get('/list', isSuperAdminOrAnalyst, _controller.list)
    .post('/create', isSuperAdminOrAnalyst, _controller.create)
    .put('/update', isSuperAdminOrAnalyst, _controller.update)
    .post('/delete', isSuperAdminOrAnalyst, _controller.delete)
    .get('/tabs', isSuperAdminOrAnalyst, _controller.getDashboardTabs)

module.exports = router
