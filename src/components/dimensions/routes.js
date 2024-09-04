const express = require('express')

const _controller = require('./controller')
const formidable = require('express-formidable');
const { isAdmin } = require('../../utils/middlewares');


module.exports = express.Router()
    .get('/', _controller.findAll)
    .get('/enabled', _controller.findAllEnabled)
    .post('/', isAdmin, formidable(), _controller.create)
    .put('/update', isAdmin, formidable(), _controller.update)
    .delete('/:_id', isAdmin, _controller.delete)
    .put('/change-status', isAdmin, _controller.changeStatus)
