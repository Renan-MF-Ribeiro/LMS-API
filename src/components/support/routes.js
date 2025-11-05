const express = require('express')
const _controller = require('./controller')
const formidable = require('express-formidable');

module.exports = express.Router()
    .post('/', formidable(), _controller.create)
    .get('/tickets', _controller.getZendeskTickets)
    //TEMPORÁRIO ATÉ MIGRAR TODOS OS CLIENTES PRA 2.13.5
    .get('/new/tickets', _controller.newGetZendeskTickets)
    .get('/ticket/:id', _controller.getZendeskTicketById)
    .post('/comment', formidable(), _controller.createComment)