const express = require('express');

const { isStudent, validateTokenRoute } = require('../../utils/middlewares');

const controller = require('./controller');

const router = express.Router();

router.use(isStudent);

router.use(validateTokenRoute);

router
    .get('/check', controller.checkFeatStatus)
    .post('/message', controller.sendMessage)


module.exports = router;
