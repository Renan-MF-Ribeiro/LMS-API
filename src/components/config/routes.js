const express = require('express');
const _controller = require('./controller');
const { isAdmin, isSuperAdmin } = require('../../utils/middlewares');

const router = express.Router();

router
    .get('/automatic-eligibility', isAdmin, _controller.getAutomaticEligibilityOnboardConfig)
    .put('/automatic-eligibility', isAdmin, _controller.updateAutomaticEligibilityOnboardConfig)
    .get('/segmentation', isSuperAdmin, _controller.getSegmentation)
    .post('/segmentation/rule', isSuperAdmin, _controller.createRule)
    .patch('/segmentation/rule/:ruleId', isSuperAdmin, _controller.updateRule)
    .post('/segmentation/exceptions', isSuperAdmin, _controller.createException)
    .patch('/segmentation/exceptions/:exceptionId', isSuperAdmin, _controller.updateException)
    .delete('/segmentation/exceptions/:exceptionId', isSuperAdmin, _controller.deleteException);

module.exports = router;
