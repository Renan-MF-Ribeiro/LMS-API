const express = require('express');
const _controller = require('./controller');
const reasonRoutes = require('./reasons/routes');
const { isEngagementManager } = require('../../../utils/middlewares');

module.exports = express
    .Router()
    .post('/', _controller.createReport)
    .get('/posts', isEngagementManager, _controller.listPostReports)
    .get('/posts/:reportId/users', isEngagementManager, _controller.findRelatedReports)
    .get('/posts/:reportId', isEngagementManager, _controller.getPostReport)
    .delete('/posts/:postId', isEngagementManager, _controller.removePostReports)
    // Rotas de gerenciamento de motivos de denúncia
    .use('/reasons', reasonRoutes);
