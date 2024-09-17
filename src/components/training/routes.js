const { Router } = require("express");
const { listTrainingSections } = require("./controller");
const { isAccountant } = require("../../utils/middlewares");

const router = Router();

router.
    get('/sections', isAccountant, listTrainingSections)

module.exports = router;