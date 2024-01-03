const express = require('express');
const router = express.Router();
const _controller = require('./controller');
const { isAluraActive } = require('../../utils/middlewares');

router
    .get('/courses/sections', isAluraActive, _controller.getSections)
    .get('/courses/trails', isAluraActive, _controller.listByTrails)
    .get(
        '/courses/trails/:idSubcategory',
        isAluraActive,
        _controller.getByTrails
    )
    .get('/courses/launch/:email/:idCourse');

module.exports = router;
