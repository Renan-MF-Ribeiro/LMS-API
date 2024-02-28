const express = require('express');
const router = express.Router();
const _controller = require('./controller');

router
    .get('/pillars', _controller.listPillars)
    .post('/pillars', _controller.createPillar)
    .put('/pillars', _controller.updatePillar)
    .get('/pillars/:pillarId', _controller.getPillar)
    .get('/cycles', _controller.listCycles)
    .post('/cycles', _controller.createCycle)
    .put('/cycles', _controller.updateCycle)
    .get('/matrix', _controller.listClientMatrices)
    .post('/matrix', _controller.createMatrix)
    .delete('/matrix/:id', _controller.softDeleteMatrix)
    .patch('/matrix/update-period', _controller.updateMatrixPeriod)
    .get('/history/:cycleId/:periodId', _controller.getHistory)
    .get(
        '/user-matrix-details/:matrixId/:periodId',
        _controller.getUserMatrixDetails
    );

module.exports = router;
