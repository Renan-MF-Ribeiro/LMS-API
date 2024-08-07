const express = require('express')
const formidable = require('express-formidable')
const { isAccountant } = require('../../utils/middlewares')
const _controller = require('./controller')

const router = express.Router()

router
    // /certificates
    .get('/findall/:clientId', _controller.getCertificates)
    .get('/find', _controller.getCertificate)
    .get('/find-open', _controller.getCertificateOpen)
    .get('/file', _controller.downloadCertificate)
    .get('/preview', _controller.previewCertificate)
    .post('/', _controller.createCertificate)
    .delete('/:id', _controller.deleteCertificate)

    // /certificates/layouts
    .post('/layouts/update', formidable(), _controller.updateLayout)
    .post('/layouts/status', _controller.updateStatus)
    .post('/layouts/create', formidable(), _controller.createLayout)
    .get('/layouts/find-one/:id', _controller.getLayout)
    .get('/layouts/:clientId', _controller.getLayouts)
    .delete('/layouts/:id', isAccountant, _controller.deleteLayout)

module.exports = router
