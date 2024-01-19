const express = require("express");
const _controller = require("./controller");
const formidable = require('express-formidable')
const { validateTokenRoute } = require('../../utils/middlewares');

module.exports = express.Router()
    .put('/login', formidable(), validateTokenRoute, _controller.createOrUpdate)
    .get('/login', _controller.getLoginScreen)
