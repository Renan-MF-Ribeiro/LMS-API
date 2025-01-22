const express = require('express');
const _controller = require('./controller');

module.exports = express
    .Router()
    // Rotas públicas
    .get('/groups/:groupId', _controller.getGroupSolicitations)
    .get('/user', _controller.getUserSolicitations)
    .post('/', _controller.createSolicitation)
    // Rotas de admin
    .post('/user/accept/:solicitationId', _controller.acceptUserSolicitation)
    .post('/user/decline/:solicitationId', _controller.declineUserSolicitation)
    // Deprecated
    .post('/group/accept/:groupId', _controller.acceptGroupSolicitation)
    .post('/group/decline/:groupId', _controller.declineGroupSolicitation)
    
