const express = require('express');
const usersRoutes = require('./users/routes');
const controller = require('./controller');
const { isMatrixModuleActive } = require('../../utils/middlewares');

module.exports = express
    .Router()
    .use('/users', usersRoutes)
    .get('/pending-actions/:target', controller.pendingActions)
    .get('/overview', isMatrixModuleActive, controller.getOverview)
    .get('/overview/:id', isMatrixModuleActive, controller.getOverviewById)
    .get('/search-content/:type', controller.searchContent)