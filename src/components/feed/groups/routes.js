const express = require('express');
const _controller = require('./controller');
const formidable = require('express-formidable');
const { isEngagementManager } = require('../../../utils/middlewares');

module.exports = express
    .Router()
    // Rotas públicas
    .get('/avaliable', _controller.getAvaliableGroups)
    .post('/', formidable(), _controller.createGroup)
    .get('/user/:userId', _controller.findUsersGroup)
    .get('/info/:groupId', _controller.getGroupById)
    .get('/members/:groupId', _controller.getGroupMembers)
    .delete('quit/:groupId', _controller.quitFromGroup)
    .put('/:groupId', formidable(),  _controller.updateGroup)
    
    // Rotas de admin
    .get('/', isEngagementManager, _controller.getAllGroups)
    .put('/:groupId', formidable(), isEngagementManager,  _controller.updateGroup)
    .patch('/members/:groupId', isEngagementManager, _controller.updateElegibleMembers)
    .delete('/:groupId/:userId', isEngagementManager, _controller.deleteUserFromGroup)
    .delete('/:groupId', isEngagementManager, _controller.deleteGroup);
