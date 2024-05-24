const express = require("express");
const _controller = require("./controller");
const formidable = require('express-formidable')
const { validateTokenRoute, isAdmin } = require('../../../utils/middlewares');

module.exports = express.Router()
    .put('/', formidable(), validateTokenRoute, _controller.createOrUpdate)
    .get('/default', validateTokenRoute, isAdmin, _controller.getDefaultTheme)
    .get('/', _controller.getTheme)

