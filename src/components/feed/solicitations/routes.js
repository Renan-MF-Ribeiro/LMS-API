const express = require('express');
const _controller = require('./controller');

module.exports = express
    .Router()
    .get('/:groupId', _controller.getGroupSolicitations)
    .post('/', _controller.createSolicitation)
    .post('/user/accept/:solicitationId', _controller.acceptUserSolicitation)
    .post('/group/accept/:groupId', _controller.acceptGroupSolicitation)
    .post('/user/decline/:solicitationId', _controller.declineUserSolicitation)
    .post('/group/decline/:groupId', _controller.declineGroupSolicitation)
    
