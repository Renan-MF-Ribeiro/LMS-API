const express = require('express');
const _controller = require('./controller');
const { isEngagementManager } = require('../../../utils/middlewares');

module.exports = express
    .Router()
    // Rotas públicas
    .get('/groups/:groupId', _controller.getGroupSolicitations)
    .get('/user', _controller.getUserSolicitations)
    .post('/', _controller.createSolicitation)
    // Rotas de admin
    .post('/user/accept/:solicitationId', isEngagementManager, _controller.acceptUserSolicitation)
    .post('/user/decline/:solicitationId', _controller.declineUserSolicitation)
    // Deprecated
    .post('/group/accept/:groupId', isEngagementManager, _controller.acceptGroupSolicitation)
    .post('/group/decline/:groupId', isEngagementManager, _controller.declineGroupSolicitation)

