const express = require("express");
const _controller = require("./controller");
const { validateTokenRoute, isSuperAdminOrEngagementManager } = require('../../../utils/middlewares');

module.exports = express.Router()
    .put('/', validateTokenRoute, isSuperAdminOrEngagementManager, _controller.createOrUpdate)
    .get('/', _controller.getConfigLogin)
