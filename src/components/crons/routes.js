const express = require('express')
const router = express.Router()
const {
    executeAverageCourses,
    executeGroupsAD,
    LastExecuteDailyCharge,
    LastExecuteAverageCourses,
    LastExecuteGroupsAD,
    executeCourseChargeNotification,
    executeCourseReleaseNotification,
    executeUsersCron,
    executeDeleteTrackingCron,
} = require('./controller')

router
    .get('/last-users', LastExecuteDailyCharge)
    .get('/last-average-courses', LastExecuteAverageCourses)
    .get('/last-groups-ad', LastExecuteGroupsAD)
    .get('/users', executeUsersCron)
    .get('/average-courses', executeAverageCourses)
    .get('/groups-ad', executeGroupsAD)
    .get('/release', executeCourseReleaseNotification)
    .get('/charge', executeCourseChargeNotification)
    .get('/exam-tracking-delete', executeDeleteTrackingCron)

module.exports = router
