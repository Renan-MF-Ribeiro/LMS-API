const express = require('express');
const controller = require('./controller');

module.exports = express
    .Router()
    .post('/send', controller.sendApplication)
    .get('/user/:userId', controller.getApplicationByUserId)
    .get('/status/:status', controller.getApplicationsByStatus)
    .post('/feedback', controller.sendFeedback)