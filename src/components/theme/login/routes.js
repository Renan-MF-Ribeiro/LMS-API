const express = require("express");
const _controller = require("./controller");
const formidable = require('express-formidable')
const { validateTokenRoute, isEngagementManager } = require('../../../utils/middlewares');
const { cacheRequest } = require("../../../utils/cache/helpers");

module.exports = express.Router()
    .put('/', formidable(), validateTokenRoute, isEngagementManager, _controller.createOrUpdate)
    .get('/', cacheRequest(), _controller.getLoginScreen)

