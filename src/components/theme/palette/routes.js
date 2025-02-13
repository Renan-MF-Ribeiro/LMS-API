const express = require("express");
const _controller = require("./controller");
const formidable = require('express-formidable')
const { validateTokenRoute, isEngagementManager } = require('../../../utils/middlewares');

module.exports = express.Router()
    .get('/', _controller.getTheme)
    .put('/', formidable(), validateTokenRoute, isEngagementManager, _controller.createOrUpdate)
    .post('/duplicate', validateTokenRoute, isEngagementManager, _controller.duplicateTheme)
    .delete('/:_id', validateTokenRoute, isEngagementManager, _controller.delete)
    .get('/list', validateTokenRoute, isEngagementManager, _controller.list)
    .put('/enable', validateTokenRoute, isEngagementManager, _controller.changeEnable)
    .get('/default', validateTokenRoute, _controller.getDefaultTheme)

