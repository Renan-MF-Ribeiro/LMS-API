const express = require("express");
const _controller = require("./controller");
const formidable = require('express-formidable')
const { validateTokenRoute, isSuperAdmin } = require('../../../utils/middlewares');

module.exports = express.Router()
    .put('/', validateTokenRoute, isSuperAdmin, _controller.update)
    .get('/', _controller.getFeatures)

