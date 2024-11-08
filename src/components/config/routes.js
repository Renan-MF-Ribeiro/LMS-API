const express = require('express');
const { getAutomaticEligibilityOnboardConfig, updateAutomaticEligibilityOnboardConfig } = require('./controller');
const { isAdmin } = require('../../utils/middlewares');

const router = express.Router();

router
    .get('/automatic-eligibility', isAdmin, getAutomaticEligibilityOnboardConfig)
    .put('/automatic-eligibility', isAdmin, updateAutomaticEligibilityOnboardConfig)

module.exports = router;
