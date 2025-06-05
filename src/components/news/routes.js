const express = require('express');
const configRoutes = require('./config/routes');
const formsRoutes = require('./forms/routes');
const categoriesRoutes = require('./categories/routes');

module.exports = express.Router()
    .use('/config', configRoutes)
    .use('/forms', formsRoutes)
    .use('/categories', categoriesRoutes)