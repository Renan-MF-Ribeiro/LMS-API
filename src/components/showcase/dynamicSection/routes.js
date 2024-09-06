const express = require("express");
const _controller = require("./controller");
const { validateTokenRoute } = require('../../../utils/middlewares');

module.exports = express.Router()
    .get('/', _controller.getList)
    .put('/', validateTokenRoute, _controller.update)
    .post('/', validateTokenRoute, _controller.create)
    .delete('/:id', _controller.delete)

