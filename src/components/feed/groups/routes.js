const express = require('express');
const _controller = require('./controller');
const formidable = require('express-formidable');

module.exports = express
    .Router()
    .get('/', _controller.getAllGroups)
    .get('/avaliable', _controller.getAvaliableGroups)
    .post('/', formidable(), _controller.createGroup)
    .get('/user/:userId', _controller.findUsersGroup)
    .get('/info/:groupId', _controller.getGroupById)
    .get('/members/:groupId', _controller.getGroupMembers)
    .put('/:groupId', formidable(), _controller.updateGroup)
    .delete('/:groupId/:userId', _controller.deleteUserFromGroup)
    .delete('quit/:groupId', _controller.quitFromGroup)
    .delete('/:groupId', _controller.deleteGroup);
