const express = require('express');
const controller = require('./controller');

module.exports = express
    .Router()
    .post('/create', controller.createTopic)
    .patch('/update/:id', controller.updateTopic)
    .delete('/delete/:id', controller.deleteTopic)
    .get('/list', controller.list)
    .get('/all', controller.all)