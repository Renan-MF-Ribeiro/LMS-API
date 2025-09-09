const express = require('express');
const _controller = require('./controller');
const { isEngagementManager } = require('../../../../utils/middlewares');

module.exports = express
    .Router()
    .get('', _controller.listReasons)
