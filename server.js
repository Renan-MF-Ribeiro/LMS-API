require('dotenv').config()
const { createTerminus } = require('@godaddy/terminus')
const { ldapClient } = require('./src/utils/auth')
const { log, error } = require('./src/utils/logger')
const app = require('./src/index')
const port = process.env.PORT || 3000
const HOSTNAME = process.env.HOSTNAME
const {
    updateAverageCourses,
    updateAverageRatings,
    sendCourseReleaseNotification,
    sendCourseChargeNotification,
    updateUserTemporaryTags,
    executeCronAverageCourses,
    deleteReprovedExamTracking,
    cronNotifyResponsibleUsers,
    cronRevokeTrail,
    cronUpdateRecommendedTrails,
    startUpdateTrailsViewsCron,
    executeInactiveOldOnboardingUsers,
    executeRemoveAutomaticEligibilityTags,
    getUsersLoadCron,
} = require('./src/utils/cron')
const { getDbCurrentFeatures, setAppCurrentFeatures } = require('./src/utils/features')

const server = app.listen(port, async () => {
    if (HOSTNAME) {
        const lastIndex = HOSTNAME.lastIndexOf('-');
        const result = HOSTNAME.substring(lastIndex + 1);

        if (result == "0") {
            cronNotifyResponsibleUsers()
            updateAverageCourses()
            updateAverageRatings()
            sendCourseReleaseNotification()
            sendCourseChargeNotification()
            updateUserTemporaryTags()
            executeCronAverageCourses()
            deleteReprovedExamTracking()
            cronRevokeTrail()
            cronUpdateRecommendedTrails()
            startUpdateTrailsViewsCron()
            getUsersLoadCron()
            executeInactiveOldOnboardingUsers()
            executeRemoveAutomaticEligibilityTags()
        }
    }

    log('Host: ' + HOSTNAME)
    log('Listening on port: ' + port)

    try {
        const dbCurrentFeatures = (await getDbCurrentFeatures()) ?? null;
        setAppCurrentFeatures(app, dbCurrentFeatures);
    } catch (err) {
        error('Error setting features: ' + err);
    }
})

createTerminus(server, {
    async healthCheck() {
        return Promise.resolve('👩‍⚕️✅')
    },

    async onSignal() {
        log('starting cleanup')
        return Promise.all([
            ldapClient.unbind(),
        ])
    },

    onShutdown() {
        log('cleanup finished, server is shutting down')
    },
})
