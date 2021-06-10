const express = require('express')
const formidable = require('express-formidable')
const shelljs = require('shelljs')
const _controller = require('./controller')
const { UPLOADS_PATH } = process.env
const {
    isAccountant,
    isStudent,
} = require('../../utils/middlewares')

try {
    shelljs.mkdir('-p', UPLOADS_PATH)
} catch { }

module.exports = express.Router()
    .post('/', isAccountant, _controller.create)
    .put('/', isAccountant, formidable(), _controller.multiUploadCreate)
    .put('/update', formidable(), _controller.update)
    .put('/update-status', isAccountant, _controller.updateStatus)
    .get('/actives', isAccountant, _controller.findItensActives)
    .get('/trails/:itemId', isAccountant, _controller.findItemTrails)
    .get('/:itemId', isStudent, _controller.findById)
    .get('/:trailId/:itemId', isStudent, _controller.findItemById)
    .get('/', isAccountant, _controller.findAll)
    .get('/generate-certificate/:item', _controller.generateCertificate)
    .delete('/:itemId', isAccountant, _controller.disableById)

    .put('/doc', isAccountant, formidable(), _controller.multiUploadDocument)
    .put('/media', isAccountant, formidable(), _controller.multiUploadMedia)
    .post('/scorm', isAccountant, [], _controller.uploadSCORM)
    .put('/:itemId/scorm', isAccountant, [], _controller.updateSCORM)
