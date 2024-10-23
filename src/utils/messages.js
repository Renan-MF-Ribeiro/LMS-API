const httpStatus = require('http-status-codes')
const { error, info } = require('./logger')
const _functions = require('./functions')

module.exports = {

    internalServer: async (res, req, err, data, component = null, rota = null) => {
        error(component, rota, err)
        await _functions.recordLog(req, 'ERROR', err, component, rota, data)
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json(data)
    },

    forbidden: async (res, req, err, data, component = null, rota = null) => {
        info(component, rota, 'forbidden', err)
        await _functions.recordLog(req, 'FORBIDDEN', err, component, rota)
        res.status(httpStatus.FORBIDDEN).json(data)
    },

    success: async (res, req, data, mensagem = null, component = null, route = null, dataNew = null, dataOld = null, store = null, action = null, namesGroups = null) => {
        if (store) await _functions.recordLog(req, action, mensagem, component, route, dataNew, dataOld, namesGroups, data)
        res.status(httpStatus.OK).json(data)
    },

    successEmpty: async (res, req, mensagem = null, component = null, route = null, store = null, action = null) => {
        if (store) await _functions.recordLog(req, action, mensagem, component, route)
        res.status(httpStatus.NO_CONTENT).send()
    },

    unauthorized: async (res, req, err, data, component = null, rota = null) => {
        info(component, rota, 'unauthorized', err)
        await _functions.recordLog(req, 'UNAUTHORIZED', err, component, rota)
        res.status(httpStatus.UNAUTHORIZED).json(data)
    },

    badRequest: async (res, req, err, data, component = null, rota = null) => {
        info(component, rota, 'badRequest', err)
        await _functions.recordLog(req, 'BAD REQUEST', err, component, rota)
        res.status(httpStatus.BAD_REQUEST).json(data)
    },

    notFound: async (res, req, err, data, component = null, rota = null) => {
        info(component, rota, 'notFound', err)
        await _functions.recordLog(req, 'NOT FOUND', err, component, rota)
        res.status(httpStatus.NOT_FOUND).json(data)
    },

    conflict: async (res, req, err, data, component = null, rota = null) => {
        info(component, rota, 'conflict', err)
        await _functions.recordLog(req, 'CONFLICT', err, component, rota)
        res.status(httpStatus.CONFLICT).json(data)
    },
}
