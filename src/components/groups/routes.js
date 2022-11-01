const express = require('express')
const router = express.Router()
const _controller = require('./controller')

const {
    isAdmin, isAccountant,
} = require('../../utils/middlewares')

router
    .post('/', isAdmin, _controller.create)
    .post('/class-group', isAdmin, _controller.createClassGroup)
    .get('/', _controller.get)
    .get('/class-groups', _controller.getClassGroups)
    .get('/tags', isAccountant, _controller.getTags)
    .get('/section-tags', isAccountant, _controller.getSectionTags)
    .put('/', isAdmin, _controller.update)
    .put('/class-group', isAdmin, _controller.updateClassGroup)
    .delete('/:id', isAdmin, _controller.delete)
    .delete('/class-group/:id', isAdmin, _controller.deleteClassGroup)
    .get('/instructor', _controller.getInstructorGroups)
    .get('/instructor/actives', _controller.getInstructorGroupsActives)
    .post('/instructor', isAdmin, _controller.createInstructor)
    .delete('/instructor/:id', isAdmin, _controller.deleteInstructor)
    .put('/instructor', isAdmin, _controller.updateInstructor)

module.exports = router
