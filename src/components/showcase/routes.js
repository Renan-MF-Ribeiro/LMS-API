const express = require('express')
const _controller = require('./controller')

module.exports = express.Router()
    .get('/', _controller.getShowCaseTrails)
    .get('/trails/:trailId', _controller.getShowCaseTrailById)
    .get('/trails', _controller.getOnlyShowCaseTrails)
