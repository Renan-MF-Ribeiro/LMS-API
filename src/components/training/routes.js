const { Router } = require("express");
const { listTrainingSections, listTrainingSectionDetails } = require("./controller");
const { isAccountant } = require("../../utils/middlewares");

const router = Router();

router
    .get('/sections', isAccountant, listTrainingSections)
    .get('/sections/:sectionId', isAccountant, listTrainingSectionDetails);

module.exports = router;