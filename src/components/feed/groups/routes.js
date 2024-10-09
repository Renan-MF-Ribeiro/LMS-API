const express = require('express');
const _controller = require('./controller');

module.exports = express
    .Router()
    .get('/', _controller.getAllGroups)
    .post('/', _controller.createGroup)
    .get('/managedby/:userId', _controller.getGroupsManagedByUser)
    .get('/ismember/:userId', _controller.findGroupsUserIsAMember)
    .get('/info/:groupId', _controller.getGroupById)
    .post('/members/:groupId/:userId', _controller.addMemberToGroups)
    .put('/:groupId', _controller.updateGroup)
    .delete('/:groupId/:userId', _controller.deleteUserFromGroup)
    .delete('/:groupId', _controller.deleteGroup)
