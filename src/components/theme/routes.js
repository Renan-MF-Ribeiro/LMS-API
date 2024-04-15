const express = require("express");

const loginRoutes = require('./login/routes');
const loginConfigRoutes = require('./login-config/routes');
const paletteRoutes = require('./palette/routes');
const galleryRoutes = require('./gallery/routes');

module.exports = express.Router()
    .use('/login', loginRoutes)
    .use('/login-config', loginConfigRoutes)
    .use('/palette', paletteRoutes)
    .use('/gallery', galleryRoutes)
