const express = require('express');
const _controller = require('./controller');
const { isSuperAdmin, isElegibilityManager } = require('../../utils/middlewares');

const router = express.Router();

router
    .get('/automatic-eligibility', isElegibilityManager, _controller.getAutomaticEligibilityOnboardConfig)
    .put('/automatic-eligibility', isElegibilityManager, _controller.updateAutomaticEligibilityOnboardConfig)

    // MATRICES
    .get('/matrices/user-visibility', isSuperAdmin, _controller.getMatrixUserVisibility)
    .patch('/matrices/user-visibility', isSuperAdmin, _controller.updateMatrixUserVisibility)
    
    // MANAGER
    .get('/manager/rule', isSuperAdmin, _controller.getManagerRule)
    .post('/manager/rule', isSuperAdmin, _controller.setManagerRule)

    // SEGMENTATION
    .get('/segmentation', isSuperAdmin, _controller.getSegmentation)
    .post('/segmentation/rule', isSuperAdmin, _controller.createRule)
    .patch('/segmentation/rule/:ruleId', isSuperAdmin, _controller.updateRule)
    .post('/segmentation/exceptions', isSuperAdmin, _controller.createException)
    .patch('/segmentation/exceptions/:exceptionId', isSuperAdmin, _controller.updateException)
    .delete('/segmentation/exceptions/:exceptionId', isSuperAdmin, _controller.deleteException)

    .get('/support-form', _controller.getCompanySupportFormConfig)

module.exports = router;
