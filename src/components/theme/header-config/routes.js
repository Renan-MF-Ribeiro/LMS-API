const express = require("express");
const _controller = require("./controller");
const { validateTokenRoute, isEngagementManager } = require('../../../utils/middlewares');

module.exports = express.Router()
    .get('/', validateTokenRoute, _controller.getConfig)
    .post('/', validateTokenRoute, isEngagementManager, _controller.CreateOrUpdate)