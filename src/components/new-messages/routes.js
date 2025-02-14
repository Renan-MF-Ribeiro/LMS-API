const express = require('express')
const router = express.Router()
const _controller = require('./controller')
const _automationController = require('./automation/controller');
const { isStudent, isAccountant } = require('../../utils/middlewares')

router
    .post('/create-list', isAccountant, _controller.createMessagingList)
    .post('/send', isAccountant, _controller.sendListToSendInBlue)
    .get('/download-list', isAccountant, _controller.downloadListFile)
    .get('/', isStudent, _controller.getMessages)
    .post('/create', isAccountant, _controller.createMessages)
    .get(
        '/automation/list',
        isAccountant,
        _automationController.listMessageAutomations
    )
    .post('/automation', isAccountant, _automationController.createMessageAutomation)
    .put(
        '/automation/:id',
        isAccountant,
        _automationController.updateMessageAutomation
    )
    .post(
        '/automation/toggle-active/:messageAutomationId',
        isAccountant,
        _automationController.toggleActive)
    .post('/send-waitinglist', _controller.sendWaitingListMessage)
    .get('/listsendinglists', isAccountant, _controller.getListsSendingLists)
    .get('/listmessage', _controller.getListMessage)
    .get('/messages/v2/:id', _controller.getById)
    .post('/updateviewed', _controller.updateViewed)
    .get('/:id', isAccountant, _controller.getMessageById)
module.exports = router
