const express = require('express')
const router = express.Router()
const _controller = require('./controller')
const { isSuperAdminOrAnalyst } = require('../../utils/middlewares');
const { logRequestMiddleware, requestUserMiddleware } = require('./middlewares');

router
    .get('/list', isSuperAdminOrAnalyst, _controller.list)
    .post('/create', isSuperAdminOrAnalyst, requestUserMiddleware, logRequestMiddleware, _controller.create)
    .put('/update', isSuperAdminOrAnalyst, requestUserMiddleware, logRequestMiddleware, _controller.update)
    .post('/delete', isSuperAdminOrAnalyst, requestUserMiddleware, logRequestMiddleware, _controller.delete)
    .get('/tabs', isSuperAdminOrAnalyst, _controller.getDashboardTabs)

module.exports = router
