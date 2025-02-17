const express = require("express");
const _controller = require("./controller");
const { validateTokenRoute, isAdmin } = require('../../../utils/middlewares');

module.exports = express.Router()
    .get('/', validateTokenRoute, isAdmin, _controller.getConfig)
    .post('/', validateTokenRoute, isAdmin, _controller.CreateOrUpdate)