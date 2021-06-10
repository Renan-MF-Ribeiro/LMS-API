const express = require('express')
const router = express.Router()
const {
    returnLogs,
} = require('./controller')

router
    .post('/', returnLogs)

module.exports = router
