const express = require("express");
const _controller = require("./controller");
const { validateTokenRoute, isEngagementManager } = require('../../../utils/middlewares');

module.exports = express.Router()
    .put('/', validateTokenRoute, isEngagementManager, _controller.createOrUpdate)
    .get('/', _controller.getConfigLogin)
