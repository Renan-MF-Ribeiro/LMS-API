const express = require('express');
const router = express.Router();
const _controller = require('./controller');

router
    .get('/sso', _controller.sso)

module.exports = router