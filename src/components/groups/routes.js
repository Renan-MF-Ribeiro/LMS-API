const express = require('express')
const router = express.Router()
const _controller = require('./controller')

const {
    isAdmin,
} = require('../../utils/middlewares')

router
    .post('/', isAdmin, _controller.create)
    .get('/', _controller.get)
    .put('/', isAdmin, _controller.update)
    .delete('/:id', isAdmin, _controller.delete)
    .get('/instructor', _controller.getInstructorGroups)
    .get('/instructor/actives', _controller.getInstructorGroupsActives)
    .post('/instructor', isAdmin, _controller.createInstructor)
    .delete('/instructor/:id', isAdmin, _controller.deleteInstructor)
    .put('/instructor', isAdmin, _controller.updateInstructor)

module.exports = router
