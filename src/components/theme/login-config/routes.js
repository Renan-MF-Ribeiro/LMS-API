const express = require("express");
const _controller = require("./controller");
const { validateTokenRoute } = require('../../../utils/middlewares');

module.exports = express.Router()
    .put('/', validateTokenRoute, _controller.createOrUpdate)
    .get('/', _controller.getConfigLogin)
