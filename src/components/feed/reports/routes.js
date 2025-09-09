const express = require('express');
const _controller = require('./controller');
const reasonRoutes = require('./reasons/routes')
const { isEngagementManager } = require('../../../utils/middlewares');

module.exports = express
    .Router()
    .get('/posts', isEngagementManager, _controller.listPostReports)
    .get('/posts/:postId/users', isEngagementManager, _controller.findRelatedReports)
    .get('/posts/:reportId', findRelatedReports, _controller.getPostReport)
    .post('/posts', _controller.createPostReport)
    .delete('/posts/:postId', isEngagementManager, _controller.removePostReports)
    // Rotas de gerenciamento de motivos de denúncia
    .use('/reasons', reasonRoutes);
