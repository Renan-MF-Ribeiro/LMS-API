const express = require("express");
const _controller = require("./controller");
const formidable = require('express-formidable')
const { validateTokenRoute, isAdmin } = require('../../../utils/middlewares');

module.exports = express.Router()
    .get('/', _controller.getTheme)
    .put('/', formidable(), validateTokenRoute, isAdmin, _controller.createOrUpdate)
    .delete('/:_id', validateTokenRoute, isAdmin, _controller.delete)
    .get('/list', validateTokenRoute, isAdmin, _controller.list)
    .put('/enable', validateTokenRoute, isAdmin, _controller.changeEnable)
    .get('/default', validateTokenRoute, _controller.getDefaultTheme)

