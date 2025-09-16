const express = require('express');
const _controller = require('./controller');
const { isEngagementManager } = require('../../../../utils/middlewares');

module.exports = express
    .Router()
    .get('/', isEngagementManager, _controller.listReasons)
    .get('/active', _controller.listActiveReasons)
    .post('/', isEngagementManager, _controller.createReason)
    .put('/:reasonId', isEngagementManager, _controller.updateReason)
    .delete('/:reasonId', isEngagementManager, _controller.deleteReason);
