const express = require('express');

const mentorRoutes = require('./mentors/routes')
const meetingRoutes = require('./meetings/routes')
const configRoutes = require('./config/routes')

module.exports = express
    .Router()
    .use('/mentors', mentorRoutes)
    //.use('/meetings', meetingRoutes)
    .use('/config', configRoutes)
