const express = require("express");
const _controller = require("./controller");
const formidable = require('express-formidable')
const { validateTokenRoute, isAdmin } = require('../../../utils/middlewares');

module.exports = express.Router()
    .get('/', validateTokenRoute, isAdmin, _controller.getConfig)
    .post('/', formidable(), validateTokenRoute, isAdmin, _controller.createOrUpdate)