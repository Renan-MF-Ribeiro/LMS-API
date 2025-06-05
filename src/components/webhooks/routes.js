const express = require("express");
const _controller = require("./controller");

module.exports = express.Router()
    .post('/', _controller.update)
    .get('/', _controller.getWebhooks)
