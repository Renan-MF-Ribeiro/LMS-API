const express = require('express');
const controller = require('./controller');

module.exports = express
    .Router()
    .post('/create', controller.createProgram)
    .patch('/update/:id', controller.updateProgram)
    .delete('/delete/:id', controller.deleteProgram)
    .get('/list', controller.list)