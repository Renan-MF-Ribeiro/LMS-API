const express = require('express');
const _controller = require('./controller');

module.exports = express
    .Router()
    .get('/', _controller.getAllGroups)
    .post('/', _controller.createGroup)
    .get('/user/:userId', _controller.findUsersGroup)
    .get('/info/:groupId', _controller.getGroupById)
    .put('/:groupId', _controller.updateGroup)
    .delete('/:groupId/:userId', _controller.deleteUserFromGroup)
    .delete('/:groupId', _controller.deleteGroup)
