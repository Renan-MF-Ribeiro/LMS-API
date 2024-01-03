const express = require('express');
const router = express.Router();
const _controller = require('./controller');
const { isAluraActive } = require('../../utils/middlewares');

router
    .get('/courses/sections', isAluraActive, _controller.getSections)
    .get('/courses/trails/:email', isAluraActive, _controller.listByTrails)
    .get(
        '/courses/trails/:email/:idSubcategory',
        isAluraActive,
        _controller.getByTrails
    );

module.exports = router;
