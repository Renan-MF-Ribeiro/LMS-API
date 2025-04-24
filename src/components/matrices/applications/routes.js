const express = require('express');
const _controller = require('./controller');

module.exports = express
    .Router()
    .get('/', _controller.findAll)
    .get('/search-content/:type', _controller.searchContent)
    .get('/last-applications', _controller.getLastApplications)
    .post('/preview', _controller.preview)
    .get('/:id', _controller.findOne)
    .post('/', _controller.create)
    .put('/:id', _controller.update)
    .delete('/:id', _controller.delete);
