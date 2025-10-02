const express = require('express');
const _controller = require('./controller');
const formidable = require('express-formidable');
const { isSuperAdmin } = require('../../utils/middlewares');

module.exports = express
    .Router()
    .get('/', isSuperAdmin, _controller.findAllPaginated)
    .get('/status', isSuperAdmin, _controller.getStatus)
    .get('/generate-records/:id', isSuperAdmin, _controller.generateRecords)

    //.get('/reprocess-result/:id', isSuperAdmin, _controller.reprocessResult)
    //.get('/generate-process-test/:type', isSuperAdmin, _controller.generateProcessTestFile)

    .get('/:id', isSuperAdmin, _controller.findOne)
    .post('/', formidable(), isSuperAdmin, _controller.create)
    .delete('/:id', isSuperAdmin, _controller.delete);
