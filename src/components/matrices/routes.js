const express = require('express');
const matricesRoutes = require('./matrices/routes');
const applicationRoutes = require('./applications/routes');

module.exports = express.Router()
    .use('/applications', applicationRoutes)
    .use('/', matricesRoutes);
