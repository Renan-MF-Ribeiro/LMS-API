const express = require("express");
const _controller = require("./controller");
const { validateTokenRoute, isSuperAdmin } = require('../../../utils/middlewares');
const { cacheRequest } = require("../../../utils/cache/helpers");

module.exports = express.Router()
    .post('/', validateTokenRoute, isSuperAdmin, _controller.update)
    .get('/', _controller.getMenu)
    .get('/filtered', cacheRequest(), _controller.getFilteredMenu)

