const express = require('express')
const categoriesRoutes = require('./categories/routes')

module.exports = express.Router()
    .use('/categories', categoriesRoutes)