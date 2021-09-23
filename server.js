require('dotenv').config()
const { createTerminus } = require('@godaddy/terminus')
const { ldapClient } = require('./src/utils/auth')
const { log } = require('./src/utils/logger')
const app = require('./src/index')
const port = process.env.PORT || 3000
const {
    updateAverageCourses,
    updateAverageRatings,
    sendCourseReleaseNotification,
    sendCourseChargeNotification,
} = require('./src/utils/cron')

const server = app.listen(port, async () => {
    log('Listening on port: ' + port)
    updateAverageCourses()
    updateAverageRatings()
    sendCourseReleaseNotification()
    sendCourseChargeNotification()
})

createTerminus(server, {
    async healthCheck () {
        return Promise.resolve('👩‍⚕️✅')
    },

    async onSignal () {
        log('starting cleanup')
        return Promise.all([
            ldapClient.unbind(),
        ])
    },

    onShutdown () {
        log('cleanup finished, server is shutting down')
    },
})
