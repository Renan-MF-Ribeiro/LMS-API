const {
    success,
    internalServer,
    badRequest,
} = require('../../utils/messages')

const {
    calculateDiffDate,
    formatDate,
    formatDateWithoutHours,
} = require('../../utils/functions')

const {
    returnLogsTypeLogin,
    returnLogsLoadDaily,
    returnLogsGroupsAd,
    returnLogsAverageCourses,
} = require('./business')

const {
    writeFileLogs,
    createCSVString,
} = require('../../utils/files')

const moment = require('moment-timezone');

module.exports = {
    async returnLogs (req, res) {
        try {
            req.setTimeout(600000)
            let { dateInitial, dateFinal, type } = req.body
            const months = calculateDiffDate(dateFinal, dateInitial, 'month')
            const records = []
            let logs

            if (months > 6) {
                badRequest(res, req, 'A diferença das datas escolhidas não pode ser maior que 6 meses!', 'A diferença das datas escolhidas não pode ser maior que 6 meses!', 'logs', 'returnLogs')
            } else {
                dateInitial = moment(dateInitial).startOf('day').format("YYYY-MM-DDTHH:mm:ss.SSS-00:00");
                dateFinal = moment(dateFinal).endOf('day').format("YYYY-MM-DDTHH:mm:ss.SSS-00:00");

                switch (type) {
                    case 1:
                        logs = await returnLogsTypeLogin(dateInitial, dateFinal)
                        break
                    case 2:
                        logs = await returnLogsLoadDaily(dateInitial, dateFinal)
                        break
                    case 3:
                        logs = await returnLogsGroupsAd(dateInitial, dateFinal)
                        break
                    case 4:
                        logs = await returnLogsAverageCourses(dateInitial, dateFinal)
                        break
                    default:
                        logs = []
                        break
                }

                for (const log of logs) {

                    const createdAtWithTimezone = moment.tz(log.createdAt, "America/Sao_Paulo");

                    records.push({
                        message: log.message,
                        ip: log.ip,
                        login: log.login,
                        create: formatDate(createdAtWithTimezone),
                    })
                }

                const header = [
                    { id: 'message', title: 'MENSAGEM' },
                    { id: 'ip', title: 'IP' },
                    { id: 'login', title: 'LOGIN DE REDE' },
                    { id: 'create', title: 'DATA' },
                ]

                const str = createCSVString(header, records)

                res.setHeader('Content-disposition', 'attachment; filename=log.csv')
                res.set('Content-Type', 'text/csv')
                res.status(200).send(str)
            }
        } catch (error) {
            internalServer(res, req, error.message, 'Erro interno no servidor', 'logs', 'returnLogs')
        }
    },
}
