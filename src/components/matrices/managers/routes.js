const express = require('express');
const _controller = require('./controller');

module.exports = express
    .Router()
    .get('/pending-actions/:target', _controller.pendingActions)
    .get('/overview', _controller.getOverview)
    .get('/overview/:id', _controller.getOverviewById)