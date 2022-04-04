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
    // .get('/mandatory', isStudent, _controller.mandatorySections)
    // .get('/recents', isStudent, _controller.recentsSections)
    // .get('/keep-learning', isStudent, _controller.keepLearningSections)
    // .get('/concluded', isStudent, _controller.concludedSections)
    .post('/', isAccountant, _controller.createSection)
    .post('/update-position', isAccountant, _controller.updatePosition)
    .put('/', isAccountant, _controller.updateSection)
    .delete('/:id', isAccountant, _controller.deleteSection)

module.exports = router
