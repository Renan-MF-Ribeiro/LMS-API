const express = require('express');
const _controller = require('./controller');
const configRoutes = require('./config/routes');
const formsRoutes = require('./forms/routes');

module.exports = express
    .Router()
    .use('/config', configRoutes)
    .use('/forms', formsRoutes)
    .get('/:id', _controller.getNews)
    .get('/', _controller.listNews)
    .post('/', _controller.createNews)
    .put('/:id', _controller.updateNews);
