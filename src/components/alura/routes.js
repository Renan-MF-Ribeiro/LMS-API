const express = require('express');
const router = express.Router();
const _controller = require('./controller');
const { isAluraActive } = require('../../utils/middlewares');

router
    .patch('/clients', isAluraActive, _controller.addResources)
    .post('/clients/check-resources', isAluraActive, _controller.checkResources)
    .get('/courses/sections', isAluraActive, _controller.getSections)
    .get('/courses/trails', isAluraActive, _controller.listByTrails)
    .get('/courses/trails/:trailId', isAluraActive, _controller.getByTrails)
    .get('/courses/launch/:itemId', isAluraActive, _controller.launch);

module.exports = router;
