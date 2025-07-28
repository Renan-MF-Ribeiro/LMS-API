const express = require("express");
const _controller = require("./controller");
const { validateTokenRoute, isSuperAdmin } = require('../../../utils/middlewares');
const { cacheRequest } = require("../../../utils/cache/helpers");

module.exports = express.Router()
    .put('/', validateTokenRoute, isSuperAdmin, _controller.update)
    .get('/', cacheRequest(), _controller.getFeatures)

