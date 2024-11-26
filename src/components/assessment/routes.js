const express = require('express');
const router = express.Router();
const _controller = require('./controller');
const formidable = require('express-formidable');

const jsonOrFormData = (req, res, next) => {
    if (req.is('json')) return next();
    return formidable({ multiples: true })(req, res, next);
};

router
    .get('/pillars', _controller.listPillars)
    .post('/pillars', _controller.createPillar)
    .put('/pillars', _controller.updatePillar)
    .get('/pillars/:pillarId', _controller.getPillar)
    .delete('/pillars/:pillarId', _controller.deletePillar)
    .get('/cycles', _controller.listCycles)
    .get('/cycles/trainingSection', _controller.cycleBySection)
    .get('/cycles-and-pillars', _controller.listCyclesAndPillars)
    .post('/cycles', jsonOrFormData, _controller.createCycle)
    .put('/cycles', jsonOrFormData, _controller.updateCycle)
    .delete('/cycles/:cycleId', formidable({ multiples: true }), _controller.deleteCycle)
    .get('/matrix', _controller.listClientMatrices)
    .post('/matrix', _controller.createMatrix)
    .put('/matrix/:matrixId', _controller.updateMatrix) 
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
    .get('/historics/training/:userId/status', _controller.listTrainingSectionsStatus)
    .get('/historics/training/:userId', _controller.listTrainingSection)

module.exports = router;
