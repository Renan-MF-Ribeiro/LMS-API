const express = require("express");
const _controller = require("./controller");
const formidable = require('express-formidable')
const { validateTokenRoute } = require('../../../utils/middlewares');

module.exports = express.Router()
    .put('/', validateTokenRoute, _controller.update)
    .get('/', _controller.getFooter)

