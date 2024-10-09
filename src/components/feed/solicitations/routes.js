const express = require('express');
const _controller = require('./controller');

module.exports = express
    .Router()
    .get('/:groupId', _controller.getGroupSolicitations)
    .post('/', _controller.createSolicitation)
    .post('/accept/:solicitationId', _controller.acceptSolicitation)
    .post('/decline/:solicitationId', _controller.declineSolicitation)
    
