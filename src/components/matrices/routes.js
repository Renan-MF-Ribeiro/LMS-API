const express = require('express');
const matricesRoutes = require('./matrices/routes');
const applicationRoutes = require('./applications/routes');
const evaluationRoutes = require('./evaluations/routes');
const userRoutes = require('./users/routes');

module.exports = express.Router()
    .use('/applications', applicationRoutes)
    .use('/evaluations', evaluationRoutes)
    .use('/users', userRoutes)
    .use('/', matricesRoutes);
