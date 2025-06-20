const express = require('express');
const router = express.Router();
const i18nController = require('./controller');

router
    .get('/:locale', i18nController.get)
    .post('/', i18nController.create)
    .put('/:id', i18nController.update);

module.exports = router;
