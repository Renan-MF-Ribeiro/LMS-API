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

const {
    getMessengerConfig,
    getCronConfig,
    getUsersDataConfig,
    getCompanyConfig,
    getChatIAConfig,
    getDashboardConfig
} = require('./src/components/config/business')
const GamificationKafka = require('./src/components/gamification/kafka/broker');

const server = app.listen(port, async () => {
    try {
        await GamificationKafka.start();
    } catch (err) {
        error('Error on connecting GamificationKafka: ' + err);
        await GamificationKafka.stop();
    }

    try {
        // Cria as configs caso não existam
        await getMessengerConfig();
        await getCronConfig();
        await getUsersDataConfig();
        await getCompanyConfig();
        await getChatIAConfig();
        await getDashboardConfig();
    } catch (err) {
        error('Error setting configs: ' + err);
    }

    if (HOSTNAME) {
        const lastIndex = HOSTNAME.lastIndexOf('-');
        const result = HOSTNAME.substring(lastIndex + 1);

        if (result == "0") {
            await cronNotifyResponsibleUsers()
            await updateAverageCourses()
            await updateAverageRatings()
            await sendCourseReleaseNotification()
            await sendCourseChargeNotification()
            await deleteReprovedExamTracking()
            await cronRevokeTrail()
            await cronUpdateRecommendedTrails()
            await getUsersLoadCron()
            await executeInactiveOldOnboardingUsers()
            await executeRemoveAutomaticEligibilityTags()
            updateUserTemporaryTags()
            executeCronAverageCourses()
            startUpdateTrailsViewsCron()
        }
    }

    log('Host: ' + HOSTNAME)
    log('Listening on port: ' + port)
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
