const express = require('express');
const router = express.Router();
const i18nController = require('./controller');
const { cacheRequestOnClient } = require('../../utils/cache/middlewares');

router
    // fase 2
    .post('/dictionary', i18nController.createDictionary)
    .get('/list', i18nController.listDictionaries)
    .get('/list/active', i18nController.listActiveDictionaries)
    .put('/:id', i18nController.updateDictionary)
    .delete('/:id', i18nController.deleteDictionary)

    .get('/default', i18nController.getDefaultDictionary)

    .get('/locale/:id', i18nController.getLocaleByDictionaryId)

    //locales
    .put('/key/:id', i18nController.updateByKey)
    .get('/:locale', cacheRequestOnClient(), i18nController.get)
    .post('/', i18nController.create)
    .put('/:id', i18nController.update)

module.exports = router;
