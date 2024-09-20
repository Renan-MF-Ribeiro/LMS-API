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
    .get('/cycles-and-pillars', _controller.listCyclesAndPillars)
    .post('/cycles', _controller.createCycle)
    .put('/cycles', _controller.updateCycle)
    .delete('/cycles/:cycleId', _controller.deleteCycle)
    .get('/matrix', _controller.listClientMatrices)
    .post('/matrix', _controller.createMatrix)
    .delete('/matrix/:id', _controller.softDeleteMatrix)
    .patch(
        '/matrix/update-period/:matrixId/:periodId',
        _controller.updateMatrixPeriod
    )
    .post('/historics/review', _controller.review)
    .post('/historics/section/:sectionId', _controller.getHistoricBySection)
    .get('/historics/interests', _controller.interests)
    .get('/historics/questions/:cycleId/:periodId', _controller.historicCycleQuestions)
    .get('/historics/:cycleId/:periodId', _controller.getHistoric)
    .get('/historics/:cycleId/:periodId/details', _controller.getHistoricDetails)
    .get('/historics/cycles-and-periods', _controller.getCyclesAndPeriods)
    .get(
        '/user-matrix-details/:matrixId/:periodId',
        _controller.getUserMatrixDetails
    )

module.exports = router;
