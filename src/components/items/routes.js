const express = require('express')
const formidable = require('express-formidable')
const shelljs = require('shelljs')
const _controller = require('./controller')
const { UPLOADS_PATH } = process.env
const {
    isAccountant,
    isStudent,
    isCollaborator,
} = require('../../utils/middlewares')

const events = [
  {
    event: 'error',
    action: function (req, res, err) { 
        return res.status(413).json({
          name: 'TOO LARGE',
          message: 'O tamanho máximo para upload de arquivos é 1GB'
        })
    }
  }
];

try {
    shelljs.mkdir('-p', UPLOADS_PATH)
} catch { }

module.exports = express.Router()
    .post('/', isAccountant, _controller.create)
    .put('/', isAccountant, formidable({ maxFileSize: 1024 * 1024 * 1024 }, events), _controller.multiUploadCreate)
    .put('/update', formidable({ maxFileSize: 1024 * 1024 * 1024 }, events), _controller.update)
    .put('/update-status', isAccountant, _controller.updateStatus)
    .get('/actives', isAccountant, _controller.findItensActives)
    .get('/details/:itemId', _controller.getItemWithTracking)
    .get('/trails/:itemId', isAccountant, _controller.findItemTrails)
    .get('/providers', isAccountant, _controller.getProviders)
    .get('/:itemId', isStudent, _controller.findById)
    .get('/:trailId/:itemId', isStudent, _controller.findItemById)
    .get('/', isAccountant, _controller.findAll)
    .get('/generate-certificate/:item', _controller.generateCertificate)
    .delete('/:itemId', isAccountant, _controller.disableById)

    .put('/doc', isAccountant, formidable(), _controller.multiUploadDocument)
    .put('/media', isAccountant, formidable(), _controller.multiUploadMedia)
    .post('/scorm', isAccountant, [], _controller.uploadSCORM)
    .put('/:itemId/scorm', isAccountant, [], _controller.updateSCORM)
    .post('/collaboration', isAccountant, formidable({ maxFileSize: 1024 * 1024 * 1024 }, events), _controller.itemColaborativo)
    .post('/vimeo', isAccountant, formidable({ maxFileSize: 1024 * 1024 * 1024 }, events), _controller.itemColaborativo)
