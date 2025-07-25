const express = require('express');
const _controller = require('./controller');
const formidable = require('express-formidable');
const { isMongoId } = require('../../../utils/middlewares');

module.exports = express
    .Router()
    .get('/:id', isMongoId, _controller.getCampaign)
    .get('/url/:campaignUrl', _controller.getCampaignByUrl)
    .get('/', _controller.listCampaigns)
    .post('/', formidable(), _controller.createCampaign)
    .put('/:id', isMongoId, formidable(), _controller.updateCampaign)
    .get('/elegible-users/:id', _controller.getEligibleUsers)
    .delete('/:id', _controller.deleteCampaign);
