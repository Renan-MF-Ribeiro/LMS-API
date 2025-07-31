const express = require("express");
const _controller = require("./controller");
const { validateTokenRoute, isSuperAdmin } = require('../../../utils/middlewares');
const { cacheRequestOnClient } = require("../../../utils/cache/middlewares");

module.exports = express.Router()
    .post('/', validateTokenRoute, isSuperAdmin, _controller.update)
    .get('/', _controller.getMenu)
    .get('/filtered', cacheRequestOnClient(), _controller.getFilteredMenu)
