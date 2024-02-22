const express = require('express');
const router = express.Router();
const _controller = require('./controller');
const { isAssessmentActive } = require('../../utils/middlewares');

router
    .get('/pillars', isAssessmentActive, _controller.listPillars)
    .post('/pillars', isAssessmentActive, _controller.createPillar)
    .put('/pillars', isAssessmentActive, _controller.updatePillar)
    .get('/cycles', isAssessmentActive, _controller.listCycles)
    .post('/cycles', isAssessmentActive, _controller.createCycle)
    .put('/cycles', isAssessmentActive, _controller.updateCycle)
    .get('/matrix', isAssessmentActive, _controller.listClientMatrices)
    .post('/matrix', isAssessmentActive, _controller.listClientMatrices)
    .delete('/matrix/:id', isAssessmentActive, _controller.softDeleteMatrix)
    .patch(
        '/matrix/update-period',
        isAssessmentActive,
        _controller.updateMatrixPeriod
    );

module.exports = router;
