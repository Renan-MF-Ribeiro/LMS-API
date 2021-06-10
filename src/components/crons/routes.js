const express = require('express')
const router = express.Router()
const {
    executeDailyCharge,
    executeAverageCourses,
    executeGroupsAD,
    LastExecuteDailyCharge,
    LastExecuteAverageCourses,
    LastExecuteGroupsAD,
} = require('./controller')

router
    .get('/last-users', LastExecuteDailyCharge)
    .get('/last-average-courses', LastExecuteAverageCourses)
    .get('/last-groups-ad', LastExecuteGroupsAD)
    .get('/users', executeDailyCharge)
    .get('/average-courses', executeAverageCourses)
    .get('/groups-ad', executeGroupsAD)

module.exports = router
