const xapi = require('../../utils/xApi')
const _functions = require('../../utils/functions')
const _messages = require('../../utils/messages')
const ItemModel = require('../items/model')
const userModel = require('../users/model')
const { Tracking } = require('../tracking/model')
const { returnLinkTrailByItem } = require('../trails/controller')

const XAPIController = {
    async attemptCourse (req, res) {
        try {
            const { itemId, userInfo } = { itemId: req.body.curso_id, userInfo: req.body.user_info }

            const item = await ItemModel.Item.findById(itemId)

            const itemTrail = await returnLinkTrailByItem(itemId)

            const user = await _functions.getUserByToken(req)

            const completeUser = await userModel.User.findById(user._id)

            if (!item || !item.isEndpointEnabled) {
                _messages.success(res, req, 'XAPI não habilitado, nada será enviado.')
                return
            }

            const bag = xapi.initTinCan(itemTrail.urlTrail, itemTrail.urlItem, completeUser)

            // await xapi.sendAttemptCurso(bag, userInfo, item, completeUser)

            _messages.success(res, req, 'Ok')
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'items', 'create')
        }
    },
    async completeCourse (req, res) {
        try {
            const { itemId } = { itemId: req.body.curso_id }
            const item = await ItemModel.Item.findById(itemId)
            const itemTrail = await returnLinkTrailByItem(itemId)
            const user = await _functions.getUserByToken(req)
            const completeUser = await userModel.User.findById(user._id)
            const itemTracking = await Tracking.findOne({ item: item._id, userLogin: user.networkLogin })

            if (!itemTracking) {
                _messages.success(res, req, 'Não existe tracking deste item, não será enviado XAPI')
            }

            if (itemTracking.isAllowedToSendXAPI && item.isEndpointEnabled) {
                const bag = xapi.initTinCan(itemTrail.urlTrail, itemTrail.urlItem, completeUser)
                // await xapi.sendCompletedCurso(bag, item, itemTracking)

                // Atualiza isXAPICompleteSent
                await Tracking.updateOne({ _id: itemTracking._id }, { isXAPICompleteSent: false })

                _messages.success(res, req, 'Ok')
                return
            }

            _messages.success(res, req, 'Não é permitido enviar sendCompletedCurso')
        } catch (error) {
            console.log(error)
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'items', 'create')
        }
    },
}

module.exports = XAPIController
