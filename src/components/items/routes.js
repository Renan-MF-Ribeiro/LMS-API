const express = require('express')
const shelljs = require('shelljs')
const _controller = require('./controller')
const { UPLOADS_PATH } = process.env
const {
    isAccountant,
    isStudent,
    isAccountantOrCollaborator,
} = require('../../utils/middlewares')

const { getFormMiddleware } = require('../../utils/files')

try {
    shelljs.mkdir('-p', UPLOADS_PATH)
} catch { }

module.exports = express.Router()
    .post('/', isAccountant, _controller.create)
    .put('/', isAccountant, getFormMiddleware(), _controller.multiUploadCreate)
    .put('/update', getFormMiddleware(), _controller.update)
    .put('/update-status', isAccountant, _controller.updateStatus)
    .get('/actives', isAccountant, _controller.findItensActives)
    .get('/details/:itemId', _controller.getItemWithTracking)
    .get('/trails/:itemId', isAccountant, _controller.findItemTrails)
    .get('/providers', isAccountant, _controller.getProviders)
    .get('/:itemId', isStudent, _controller.findById)
    .patch('/:itemId/archive', isAccountant, _controller.archive)
    .patch('/:itemId/unarchive', isAccountant, _controller.unarchive)
    .get('/:trailId/:itemId', isStudent, _controller.findItemById)
    .get('/', isAccountant, _controller.findAll)
    .get('/generate-certificate/:item', _controller.generateCertificate)
    .delete('/:itemId', isAccountant, _controller.disableById)

    .put('/doc', isAccountantOrCollaborator, getFormMiddleware(), _controller.multiUploadDocument)
    .put('/media', isAccountantOrCollaborator, getFormMiddleware(), _controller.multiUploadMedia)
    .post('/scorm', isAccountant, [], _controller.uploadSCORM)
    .put('/:itemId/scorm', isAccountant, [], _controller.updateSCORM)
    .post('/collaboration', isAccountantOrCollaborator, getFormMiddleware(), _controller.itemColaborativo)
    .post('/vimeo', isAccountantOrCollaborator, getFormMiddleware(), _controller.itemColaborativo)
