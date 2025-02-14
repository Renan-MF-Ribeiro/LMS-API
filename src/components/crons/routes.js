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
    handleInactiveOldOnboardingUsers,
    handleRemoveAutomaticEligibilityTags,
    executeIntegratorCron,
} = require('./controller')
const { isSuperAdmin } = require('../../utils/middlewares')

router
    .get('/last-users', isSuperAdmin, LastExecuteDailyCharge)
    .get('/last-average-courses', isSuperAdmin, LastExecuteAverageCourses)
    .get('/last-groups-ad', isSuperAdmin, LastExecuteGroupsAD)
    .get('/users', isSuperAdmin, executeUsersCron)
    .get('/average-courses', isSuperAdmin, executeAverageCourses)
    .get('/groups-ad', isSuperAdmin, executeGroupsAD)
    .get('/release', isSuperAdmin, executeCourseReleaseNotification)
    .get('/charge', isSuperAdmin, executeCourseChargeNotification)
    .get('/integrator', isSuperAdmin, executeIntegratorCron)
    .get('/exam-tracking-delete', isSuperAdmin, executeDeleteTrackingCron)
    .get('/revoke-trails', isSuperAdmin, executeCronRevokeTrail)
    .get('/recommended-trails', isSuperAdmin, executeRecommendedTrails)
    .get('/update-trails-views', isSuperAdmin, executeUpdateTrailsViewsCron)
    .get('/inactive-old-onboarding-users', isSuperAdmin, handleInactiveOldOnboardingUsers)
    .get('/remove-automatic-eligibility-tags', isSuperAdmin, handleRemoveAutomaticEligibilityTags)


module.exports = router
