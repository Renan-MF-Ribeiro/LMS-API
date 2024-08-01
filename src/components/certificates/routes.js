const express = require('express')
const router = express.Router()
const _controller = require('./controller')
const { isAccountant } = require('../../utils/middlewares')

router
    // /certificates
    // .get('/findall/:clientId', _controller.getCertificates)
    // .get('/find', _controller.getCertificate)
    // .get('/find-open', _controller.getCertificateOpen)
    // .get('/file', _controller.downloadCertificate)
    .get('/preview', _controller.previewCertificate)
    // .post('/', _controller.createCertificate)
    // .delete('/:id', _controller.deleteCertificate)
    
    // // /certificates/layouts
    // .post('/layouts/update', _controller.updateLayout)
    // .post('/layouts/create', _controller.createLayout)
    // .get('/layouts/find-one/:id', _controller.getLayout)
    // .get('/layouts/:clientId', _controller.getLayouts)
    .delete('/layouts/:id', isAccountant, _controller.deleteLayout)

module.exports = router
