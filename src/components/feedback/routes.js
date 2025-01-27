const express = require('express');
const router = express.Router();
const _controller = require('./controller');

router
    .post('/save', _controller.saveSurvey)
    .post('/updatesurvey', _controller.updateSurvey)
    .get('/listbyuser', _controller.listByUser)

module.exports = router
