const express = require("express");
const _controller = require("./controller");
const formidable = require('express-formidable')
const { validateTokenRoute, isAdmin } = require('../../../utils/middlewares');
const { cacheRequest } = require("../../../utils/cache/helpers");

module.exports = express.Router()
    .get('/', cacheRequest(), validateTokenRoute, _controller.getConfig)
    .post('/', formidable(), validateTokenRoute, isAdmin, _controller.createOrUpdate)