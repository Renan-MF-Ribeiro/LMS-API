const express = require('express');
const matricesRoutes = require('./matrices/routes');
const applicationRoutes = require('./applications/routes');
const evaluationRoutes = require('./evaluations/routes');

module.exports = express.Router()
    .use('/applications', applicationRoutes)
    .use('/evaluations', evaluationRoutes)
    .use('/', matricesRoutes);
