const express = require('express');
const router = express.Router();
const _controller = require('./controller');
const { isAssessmentActive } = require('../../utils/middlewares');

router
    .get('/pillars', isAssessmentActive, _controller.listPillars)
    .post('/pillars', isAssessmentActive, _controller.createPillar)
    .put('/pillars', isAssessmentActive, _controller.updatePillar)

module.exports = router;
