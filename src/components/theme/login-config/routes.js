const express = require("express");
const _controller = require("./controller");
const { validateTokenRoute, isSuperAdminOrEngagementManager } = require('../../../utils/middlewares');
const { cacheRequest } = require("../../../utils/cache/helpers");

module.exports = express.Router()
    .put('/', validateTokenRoute, isSuperAdminOrEngagementManager, _controller.createOrUpdate)
    .get('/', cacheRequest(), _controller.getConfigLogin)
