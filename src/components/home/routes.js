const express = require('express');
const _controller = require('./controller');
const { isStudent } = require('../../utils/middlewares');

module.exports = express
    .Router()
    .get('/searchBy', isStudent, _controller.searchTrailsItems)
    .get('/dashboard-student', isStudent, _controller.dashboardStudent)
    .get('/dashboard-studentv2', isStudent, _controller.dashboardStudentv2)
    .get('/certificates', isStudent, _controller.listCertificates)
    .get('/certificates/expired', isStudent, _controller.listCertificates)
