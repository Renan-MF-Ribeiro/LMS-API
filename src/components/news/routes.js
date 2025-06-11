const express = require('express');
const formidable = require('express-formidable');
const _controller = require('./controller');
const configRoutes = require('./config/routes');
const formsRoutes = require('./forms/routes');
const categoriesRoutes = require('./categories/routes');
const campaignsRoutes = require('./campaigns/routes');
const homeRoutes = require('./home/routes');

module.exports = express
    .Router()
    .use('/config', configRoutes)
    .use('/forms', formsRoutes)
    .use('/categories', categoriesRoutes)
    .use('/campaigns', campaignsRoutes)
    .use('/home', homeRoutes)
    .get('/:id', _controller.getNews)
    .get('/', _controller.listNews)
    .post('/', formidable(), _controller.createNews)
    .put('/:id', formidable(), _controller.updateNews);
