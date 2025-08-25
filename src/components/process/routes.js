const express = require('express');
const _controller = require('./controller');
const formidable = require('express-formidable');

module.exports = express
    .Router()
    .get('/', _controller.findAllPaginated)
    .get('/status', _controller.getStatus)
    .get('/generate-records/:id', _controller.generateRecords)
    .get('/process-records/:id', _controller.processRecords)
    .get('/:id', _controller.findOne)
    

    //.get('/user/:id', _controller.findByUserId)

    .post('/', formidable(), _controller.create)
    .delete('/:id', _controller.delete);
