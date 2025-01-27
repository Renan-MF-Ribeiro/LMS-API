const express = require("express");
const _controller = require("./controller");
const formidable = require('express-formidable')
const { validateTokenRoute, isEngagementManager } = require('../../../utils/middlewares');

module.exports = express.Router()
    .put('/', formidable(), validateTokenRoute, _controller.create)
    .put('/setDefault', validateTokenRoute, isEngagementManager, _controller.setDefault)
    .get('/', _controller.list)

