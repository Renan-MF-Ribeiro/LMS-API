const express = require('express');
const router = express.Router();
const _controller = require('./controller');
const { isEngagementManager } = require('../../utils/middlewares');
const { hasFeature } = require('../../utils/middlewares');
const formidable = require('express-formidable');

router.use(hasFeature('gamefication'));

router
    // Not admin routes
    .get('/clients', _controller.getClient)
    .get('/clients/events', _controller.getClientEvents)
    .get('/clients/niveis', _controller.getClientNiveis)
    .get('/event-users', _controller.getExtractByClient)
    .get('/event-users/:networkLogin', _controller.getExtractByUser)
    .get('/ranking-users/:networkLogin', _controller.listRankingByUser)
    .get('/rewards-users/:networkLogin', _controller.listRewardsByUser)
    .get('/users/:networkLogin', _controller.getClientUser)
    // Admin routes
    .put('/clients', isEngagementManager, _controller.updateClient)
    .put('/clients/niveis/:nivelId', isEngagementManager, formidable(), _controller.updateClientNivelImage)
    .get('/ranking-users/:_id/details', isEngagementManager, _controller.getClientRankingUsersDetails)
    .get('/rankings', isEngagementManager, _controller.getClientRankings)
    .post('/rankings', isEngagementManager, _controller.createClientRankings)
    .put('/rankings/:_id', isEngagementManager, _controller.updateClientRankings)
    .delete('/rankings/:_id', isEngagementManager, _controller.deleteClientRankings)
    .get('/rewards', isEngagementManager, _controller.getClientRewards)
    .post('/rewards', isEngagementManager, formidable(), _controller.createClientRewards)
    .put('/rewards/:_id', isEngagementManager, formidable(), _controller.updateClientRewards)
    .delete('/rewards/:_id', isEngagementManager, _controller.deleteClientRewards)

module.exports = router;
