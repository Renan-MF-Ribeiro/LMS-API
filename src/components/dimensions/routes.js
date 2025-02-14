const express = require('express')

const _controller = require('./controller')
const formidable = require('express-formidable');
const { isAccountant } = require('../../utils/middlewares');


module.exports = express.Router()
    .get('/', _controller.findAll)
    .get('/enabled', _controller.findAllEnabled)
    .post('/', isAccountant, formidable(), _controller.create)
    .put('/update', isAccountant, formidable(), _controller.update)
    .delete('/:_id', isAccountant, _controller.delete)
    .put('/change-status', isAccountant, _controller.changeStatus)
