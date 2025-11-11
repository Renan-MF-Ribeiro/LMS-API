const express = require('express');
const router = express.Router();
const i18nController = require('./controller');
const { cacheRequestOnClient } = require('../../utils/cache/middlewares');

router
    .get('/:locale', cacheRequestOnClient(), i18nController.get)
    .post('/', i18nController.create)
    .put('/:id', i18nController.update)

    //fase 2

    .get('/default/:code', i18nController.getDefaultLocale)
    .get('/list/all', i18nController.listAll)
    .get('/list/active', i18nController.listActive)
    .put('/key/:clientId/:id', i18nController.updateByKey)

module.exports = router;
