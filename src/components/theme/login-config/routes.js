const express = require("express");
const _controller = require("./controller");
const { validateTokenRoute, isSuperAdminOrEngagementManager } = require('../../../utils/middlewares');
const { cacheRequest } = require("../../../utils/cache/middlewares");

module.exports = express.Router()
    .put('/', validateTokenRoute, isSuperAdminOrEngagementManager, _controller.createOrUpdate)
    .get('/', cacheRequest(), _controller.getConfigLogin)
