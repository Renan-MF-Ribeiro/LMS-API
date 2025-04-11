const express = require('express');
const controller = require('./controller');
const formidable = require('express-formidable');

module.exports = express
    .Router()
    .post('/create', formidable(), controller.createProgram)
    .patch('/update/:id', formidable(), controller.updateProgram)
    .delete('/delete/:id', controller.deleteProgram)
    .get('/', controller.list)