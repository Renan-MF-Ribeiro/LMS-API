const express = require("express");
const _controller = require("./controller");
const { validateTokenRoute, isEngagementManager } = require('../../../utils/middlewares');
const { cacheRequest } = require("../../../utils/cache/helpers");

module.exports = express.Router()
    .put('/', validateTokenRoute, isEngagementManager, _controller.update)
    .get('/', cacheRequest(), _controller.getFooter)

