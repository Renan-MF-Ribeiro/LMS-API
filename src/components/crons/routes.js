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
    executeCronRevokeTrail,
    executeRecommendedTrails,
    executeUpdateTrailsViewsCron,
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
    .get('/revoke-trails', executeCronRevokeTrail)
    .get('/recommended-trails', executeRecommendedTrails)
    .get('/update-trails-views', executeUpdateTrailsViewsCron)


module.exports = router
