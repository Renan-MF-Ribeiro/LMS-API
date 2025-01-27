const express = require('express')
const router = express.Router()
const _controller = require('./controller')
const _automationController = require('./automation/controller');
const { isElegibilityManager } = require('../../utils/middlewares')

router
    .post('/create-list', isElegibilityManager, _controller.createMessagingList)
    .post('/send', isElegibilityManager, _controller.sendListToSendInBlue)
    .get('/download-list', isElegibilityManager, _controller.downloadListFile)
    .get('/', isElegibilityManager, _controller.getMessages)
    .get('/:id', isElegibilityManager, _controller.getMessageById)
    .post('/create', isElegibilityManager, _controller.createMessages)
    .get(
        '/automation/list',
        isElegibilityManager,
        _automationController.listMessageAutomations
    )
    .post('/automation', isElegibilityManager, _automationController.createMessageAutomation)
    .put(
        '/automation/:id',
        isElegibilityManager,
        _automationController.updateMessageAutomation
    )
    .post(
        '/automation/toggle-active/:messageAutomationId',
        isElegibilityManager,
        _automationController.toggleActive)
        .post('/send-waitinglist', _controller.sendWaitingListMessage);

module.exports = router
