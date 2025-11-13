const express = require('express');
const router = express.Router();
const i18nController = require('./controller');
const { cacheRequestOnClient } = require('../../utils/cache/middlewares');

router
    .get('/:locale', cacheRequestOnClient(), i18nController.get)
    .post('/', i18nController.create)
    .put('/:id', i18nController.update)

    //fase 2

    .post('/dictionary', i18nController.createDictionary)
    .get('/dictionary/list', i18nController.listDictionaries)
    .get('/dictionary/active', i18nController.listActiveDictionaries)
    .put('/key/:id', i18nController.updateByKey)

module.exports = router;    
