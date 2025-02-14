const express = require('express');
const router = express.Router();
const _controller = require('./controller');
const { isAdmin, hasFeature } = require('../../utils/middlewares');
const formidable = require('express-formidable');

router.use(hasFeature('gamefication'));

router
    // Not admin routes
    .get('/clients', _controller.getClient)
    .get('/clients/events', _controller.getClientEvents)
    .get('/event-users', _controller.getExtractByClient)
    .get('/event-users/:networkLogin', _controller.getExtractByUser)
    .get('/ranking-users/:networkLogin', _controller.listRankingByUser)
    .get('/rewards-users/:networkLogin', _controller.listRewardsByUser)
    .get('/users/:networkLogin', _controller.getClientUser)
    // Admin routes
    .put('/clients', isAdmin, _controller.updateClient)
    .put('/clients/niveis/:nivelId', isAdmin, formidable(), _controller.updateClientNivelImage)
    .get('/ranking-users/:_id/details', isAdmin, _controller.getClientRankingUsersDetails)
    .get('/rankings', isAdmin, _controller.getClientRankings)
    .post('/rankings', isAdmin, _controller.createClientRankings)
    .put('/rankings/:_id', isAdmin, _controller.updateClientRankings)
    .delete('/rankings/:_id', isAdmin, _controller.deleteClientRankings)
    .get('/rewards', isAdmin, _controller.getClientRewards)
    .post('/rewards', isAdmin, formidable(), _controller.createClientRewards)
    .put('/rewards/:_id', isAdmin, formidable(), _controller.updateClientRewards)
    .delete('/rewards/:_id', isAdmin, _controller.deleteClientRewards)

module.exports = router;
