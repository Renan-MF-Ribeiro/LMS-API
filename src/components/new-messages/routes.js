const express = require('express')
const router = express.Router()
const _controller = require('./controller')
const _automationController = require('./automation/controller');
const { isStudent, isSuperAdmin } = require('../../utils/middlewares')

router
    .post('/create-list', isSuperAdmin, _controller.createMessagingList)
    .post('/send', isSuperAdmin, _controller.sendListToSendInBlue)
    .get('/download-list', isSuperAdmin, _controller.downloadListFile)
    .get('/', isStudent, _controller.getMessages)
    .get('/:id', isSuperAdmin, _controller.getMessageById)
    .post('/create', isSuperAdmin, _controller.createMessages)
    .get(
        '/automation/list',
        isSuperAdmin,
        _automationController.listMessageAutomations
    )
    .post('/automation', isSuperAdmin, _automationController.createMessageAutomation)
    .put(
        '/automation/:id',
        isSuperAdmin,
        _automationController.updateMessageAutomation
    )
    .post(
        '/automation/toggle-active/:messageAutomationId',
        isSuperAdmin,
        _automationController.toggleActive)
    .post('/send-waitinglist', _controller.sendWaitingListMessage)
    .get('/listsendinglists', isSuperAdmin, _controller.getListsSendingLists)
    .get('/listmessage', _controller.getListMessage)
    .get('/messages/v2/:id', _controller.getById)
    .post('/updateviewed', _controller.updateViewed)
module.exports = router
