const express = require('express')

const _controller = require('./controller')
const formidable = require('express-formidable');
const { isAdmin } = require('../../utils/middlewares');


module.exports = express.Router()
    .get('/', _controller.findAll)
    .post('/', isAdmin, formidable(), _controller.create)
    .put('/update', isAdmin, formidable(), _controller.update)
    .put('/change-status', isAdmin, _controller.changeStatus)
