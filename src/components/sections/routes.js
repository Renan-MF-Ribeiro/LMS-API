const express = require('express')
const router = express.Router()
const _controller = require('./controller')
const {
    isStudent,
    isAccountant,
} = require('../../utils/middlewares')

router
    .get('/', isStudent, _controller.returnSections)
    .get('/elegibles-contents', isStudent, _controller.getSectionsElegibles)
    .get('/formation', isStudent, _controller.getSectionsFormation)
    .get('/:id', isStudent, _controller.getSectionDetail)
    .patch('/:id/:status', isAccountant, _controller.changeStatus)
    .post('/', isAccountant, _controller.createSection)
    .post('/update-position', isAccountant, _controller.updatePosition)
    .put('/', isAccountant, _controller.updateSection)
    .delete('/:id', isAccountant, _controller.deleteSection)

module.exports = router
