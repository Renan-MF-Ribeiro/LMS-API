const express = require('express');
const router = express.Router();
const _controller = require('./controller');
const { isAdmin } = require('../../utils/middlewares');
const formidable = require('express-formidable')

router
    // Not admin routes
    .get('/clients', _controller.getClient)
    .get('/clients/events', _controller.getClientEvents)
    .get('/event-users/:networkLogin', _controller.getExtractByClient)
    .get('/event-users/:networkLogin', _controller.getExtractByUser)
    .get('/ranking-users/:networkLogin', _controller.listRankingByUser)
    .get('/users/:networkLogin', _controller.getClientUser)
    // Admin routes
    .put('/clients', isAdmin, _controller.updateClient)
    .put('/clients/niveis/:nivelId', isAdmin, formidable(), _controller.updateClientNivelImage)
    .get('/ranking-users/:_id/details', isAdmin, _controller.getClientRankingUsersDetails)
    .get('/rankings', isAdmin, _controller.getClientRankings)
    .post('/rankings', isAdmin, _controller.createClientRankings)
    .put('/rankings/:_id', isAdmin, _controller.updateClientRankings)
    .delete('/rankings/:_id', isAdmin, _controller.deleteClientRankings)

    module.exports = router;
