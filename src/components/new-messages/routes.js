const express = require('express')
const router = express.Router()
const _controller = require('./controller')
const _automationController = require('./automation/controller');
const { isAdmin } = require('../../utils/middlewares')

router
    .post('/create-list', isAdmin, _controller.createMessagingList)
    .post('/send', isAdmin, _controller.sendListToSendInBlue)
    .get('/download-list', isAdmin, _controller.downloadListFile)
    .get('/', isAdmin, _controller.getMessages)
    .get('/:id', isAdmin, _controller.getMessageById)
    .post('/create', isAdmin, _controller.createMessages)
    .get(
        '/automation/list',
        isAdmin,
        _automationController.listMessageAutomations
    )
    .post('/automation', isAdmin, _automationController.createMessageAutomation)
    .put(
        '/automation/:id',
        isAdmin,
        _automationController.updateMessageAutomation
    )
    .post(
        '/automation/toggle-active/:messageAutomationId',
        isAdmin,
        _automationController.toggleActive
);

module.exports = router
