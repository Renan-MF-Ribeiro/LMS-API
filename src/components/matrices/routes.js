const express = require('express');
const matricesRoutes = require('./matrices/routes');
const applicationRoutes = require('./applications/routes');
const evaluationRoutes = require('./evaluations/routes');
const userRoutes = require('./users/routes');
const managerRoutes = require('./managers/routes');
const { isMatricesManager } = require('../../utils/middlewares');

module.exports = express.Router()
    .use('/applications', applicationRoutes)
    .use('/evaluations', evaluationRoutes)
    .use('/users', userRoutes)
    .use('/managers', isMatricesManager, managerRoutes)
    .use('/', matricesRoutes);
