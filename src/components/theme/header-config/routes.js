const express = require("express");
const _controller = require("./controller");
const { validateTokenRoute, isEngagementManager } = require('../../../utils/middlewares');
const { cacheRequest } = require("../../../utils/cache/middlewares");

module.exports = express.Router()
    .get('/', cacheRequest(), validateTokenRoute, _controller.getConfig)
    .post('/', validateTokenRoute, isEngagementManager, _controller.CreateOrUpdate)