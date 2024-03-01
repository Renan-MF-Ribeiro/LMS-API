const express = require('express');
const router = express.Router();
const _controller = require('./controller');

router
    .get('/pillars', _controller.listPillars)
    .post('/pillars', _controller.createPillar)
    .put('/pillars', _controller.updatePillar)
    .get('/pillars/:pillarId', _controller.getPillar)
    .delete('/pillars/:pillarId', _controller.deletePillar)
    .get('/cycles', _controller.listCycles)
    .post('/cycles', _controller.createCycle)
    .put('/cycles', _controller.updateCycle)
    .get('/cycles/review/:cycleId', _controller.review)
    .delete('/cycles/:cycleId', _controller.deleteCycle)
    .get('/matrix', _controller.listClientMatrices)
    .post('/matrix', _controller.createMatrix)
    .delete('/matrix/:id', _controller.softDeleteMatrix)
    .patch('/matrix/update-period', _controller.updateMatrixPeriod)
    .get('/historics/:cycleId/:periodId', _controller.getCycleHistory)
    .get(
        '/user-matrix-details/:matrixId/:periodId',
        _controller.getUserMatrixDetails
    )
    .post('/historics/review', _controller.review);

module.exports = router;
