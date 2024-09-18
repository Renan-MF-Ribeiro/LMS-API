const { Router } = require("express");
const { listTrainingSections, listTrainingSectionDetails, generateTrainingSectionCertificate } = require("./controller");
const { isAccountant, validateTokenRoute } = require("../../utils/middlewares");

const router = Router();

router
    .get('/sections', isAccountant, listTrainingSections)
    .get('/sections/:sectionId', isAccountant, listTrainingSectionDetails)
    .get('/sections/:sectionId/certificate', validateTokenRoute, generateTrainingSectionCertificate);

module.exports = router;