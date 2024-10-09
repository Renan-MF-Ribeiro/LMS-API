const express = require('express');

const groupRoutes = require('./groups/routes')
const postRoutes = require('./posts/routes')
const solicitationRoutes = require('./solicitations/routes')
module.exports = express
    .Router()
    .use('/groups', groupRoutes)
    .use('/solicitations', solicitationRoutes)
    .use('/posts', postRoutes)
