const _messages = require('../../utils/messages')
const { Log } = require('../logs/model')
const {
    executeCronDailyCharge,
    executeCronAverageCourses,
    executeCronGroupsAD,
} = require('../../utils/cron')

module.exports = {
    async executeDailyCharge (req, res) {
        executeCronDailyCharge()
        res.status(200).json('CRON INICIADO COM SUCESSO')
    },

    async executeAverageCourses (req, res) {
        executeCronAverageCourses()
        res.status(200).json('CRON INICIADO COM SUCESSO')
    },

    async executeGroupsAD (req, res) {
        executeCronGroupsAD()
        res.status(200).json('CRON INICIADO COM SUCESSO')
    },

    async LastExecuteDailyCharge (req, res) {
        try {
            let log = await Log.findOne({ component: 'CRON_DAILY_CHARGE' }).sort({ createdAt: -1 })
            if (log) {
                log = await verifyLog(log)
                _messages.success(res, req, log)
            } else {
                _messages.badRequest(res, req, 'Erro ao buscar última execução do cron usuários ')
            }
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', '/last-users')
        }
    },

    async LastExecuteAverageCourses (req, res) {
        try {
            let log = await Log.findOne({ component: 'CRON_AVERAGE' }).sort({ createdAt: -1 })
            if (log) {
                log = await verifyLog(log)
                _messages.success(res, req, log)
            } else {
                _messages.badRequest(res, req, 'Erro ao buscar última execução do cron de médias')
            }
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', '/last-average-courses')
        }
    },

    async LastExecuteGroupsAD (req, res) {
        try {
            let log = await Log.findOne({ component: 'CRON_GROUP' }).sort({ createdAt: -1 })
            if (log) {
                log = await verifyLog(log)
                _messages.success(res, req, log)
            } else {
                _messages.badRequest(res, req, 'Erro ao buscar última execução do cron de grupos')
            }
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', '/last-groups-ad')
        }
    },
}

async function verifyLog (log) {
    const msg = log.message.toLowerCase()
    let successful = msg.indexOf('sucesso')
    if (successful !== -1) {
        successful = true
        log = { log, successful }
    } else {
        successful = false
        log = { log, successful }
    }
    return log
}
