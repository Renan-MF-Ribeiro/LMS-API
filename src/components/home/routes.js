const express = require('express')
const _controller = require('./controller')
const {
    isStudent,
} = require('../../utils/middlewares')

module.exports = express.Router()
    .get('/searchBy', isStudent, _controller.searchTrailsItems)
    .get('/dashboard-student', isStudent, _controller.dashboardStudent)
