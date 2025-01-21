const express = require('express')
const formidable = require('express-formidable')
const { isAccountant } = require('../../utils/middlewares')
const _controller = require('./controller')
const { validateTokenRoute, } = require('../../utils/middlewares')
const router = express.Router()

router
    // /certificates
    .get('/findall', validateTokenRoute, _controller.getCertificates)
    .get('/find', validateTokenRoute, _controller.getCertificate)
    .get('/find-open', _controller.getCertificateOpen)
    .get('/file', validateTokenRoute, _controller.downloadCertificate)
    .get('/preview', validateTokenRoute, _controller.previewCertificate)
    .post('/', validateTokenRoute, _controller.createCertificate)
    .delete('/:id', validateTokenRoute, _controller.deleteCertificate)

    // /certificates/layouts
    .post('/layouts/update', validateTokenRoute, formidable(), _controller.updateLayout)
    .post('/layouts/status', validateTokenRoute, _controller.updateStatus)
    .post('/layouts/create', validateTokenRoute, formidable(), _controller.createLayout)
    .get('/layouts/find-one/:id', validateTokenRoute, _controller.getLayout)
    .get('/layouts', validateTokenRoute, _controller.getLayouts)
    .delete('/layouts/:id', validateTokenRoute, isAccountant, _controller.deleteLayout)

module.exports = router
