const express = require("express");
const _controller = require("./controller");
const { validateTokenRoute, isSuperAdmin } = require('../../../utils/middlewares');

module.exports = express.Router()
    .post('/', validateTokenRoute, isSuperAdmin, _controller.update)
    .get('/', _controller.getMenu)
    .get('/filtered', _controller.getFilteredMenu)

