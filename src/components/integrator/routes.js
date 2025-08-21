const express = require('express')
const _controller = require('./controller')

module.exports = express.Router()
    .get('/config', _controller.getUsersProviderConfig)
    .put('/config', _controller.updateUsersProviderConfig)
    .put('/options', _controller.updateUsersProviderCredentials)