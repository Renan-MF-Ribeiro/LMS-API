const express = require('express')
const _controller = require('./controller')

module.exports = express.Router()
    .get('/config', _controller.getUsersProviderConfig)
    .put('/config', _controller.updateUsersProviderConfig)
    .get('/options', _controller.getUsersProviderCredentials)
    .put('/options', _controller.updateUsersProviderCredentials)