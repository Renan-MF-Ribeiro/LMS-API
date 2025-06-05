const express = require('express')
const _controller = require('./controller')
const categoriesRoutes = require('./categories/routes')

module.exports = express.Router()
    .use('/categories', categoriesRoutes)