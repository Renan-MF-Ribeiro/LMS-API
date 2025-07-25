const express = require('express');

const controller = require('./controller');

const { isStudent, validateTokenRoute } = require('../../utils/middlewares');
const { cacheRequestOnClient } = require('../../utils/cache/helpers');

const router = express.Router();

router.use(isStudent);

router.use(validateTokenRoute);

router
    .get('/check', cacheRequestOnClient(), controller.checkFeatStatus)
    .post('/message', controller.sendMessage)
    .post('/message/:messageId/feedback', controller.feedbackMessage)


module.exports = router;
