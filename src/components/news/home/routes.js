const express = require('express');
const _controller = require('./controller');
const formidable = require('express-formidable');
const { isMongoId } = require('../../../utils/middlewares');

module.exports = express
    .Router()
    .get('/', _controller.listNews)
    .get('/:id', _controller.getNews)
    .get('/campaigns', _controller.listCampaigns);
