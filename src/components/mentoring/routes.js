const express = require('express');

const mentorRoutes = require('./mentors/routes')
const mentoreeRoutes = require('./mentorees/routes')
const meetingRoutes = require('./meetings/routes')
const configRoutes = require('./config/routes')
const applicationRoutes = require('./applications/routes')
const topicsRoutes = require('./topics/routes')
const programsRoutes = require('./programs/routes')

module.exports = express
    .Router()
    .use('/mentors', mentorRoutes)
    .use('/mentoree', mentoreeRoutes)
    .use('/meetings', meetingRoutes)
    .use('/config', configRoutes)
    .use('/applications', applicationRoutes)
    .use('/topics', topicsRoutes)
    .use('/programs', programsRoutes)
