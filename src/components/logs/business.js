/* eslint-disable no-async-promise-executor */
const {
    Log,
} = require('./model')

const {
    formatDateWithoutHours,
} = require('../../utils/functions')

module.exports = {
    returnLogsTypeLogin (dateInitial, dateFinal) {
        return new Promise(async (resolve, reject) => {
            try {
                const result = await logs(
                    {
                        component: 'users',
                        route: 'ldapSignIn',
                    }, dateInitial, dateFinal)
                resolve(result)
            } catch (error) {
                reject(error)
            }
        })
    },

    returnLogsLoadDaily (dateInitial, dateFinal) {
        return new Promise(async (resolve, reject) => {
            try {
                const result = await logs({
                    $text: { $search: 'CARGA DIÁRIA' },
                }, dateInitial, dateFinal)
                resolve(result)
            } catch (error) {
                reject(error)
            }
        })
    },

    returnLogsGroupsAd (dateInitial, dateFinal) {
        return new Promise(async (resolve, reject) => {
            try {
                const result = await logs({
                    $text: { $search: 'ROTINA AD' },
                }, dateInitial, dateFinal)
                resolve(result)
            } catch (error) {
                reject(error)
            }
        })
    },

    returnLogsAverageCourses (dateInitial, dateFinal) {
        return new Promise(async (resolve, reject) => {
            try {
                const result = await logs({
                    $text: { $search: 'MÉDIAS' },
                }, dateInitial, dateFinal)
                resolve(result)
            } catch (error) {
                reject(error)
            }
        })
    },

}

function returnResult (dateInitial, dateFinal, logs) {
    const result = []

    for (const log of logs) {
        const flag = checkIfDateIsLongerThanTheOther(dateInitial, dateFinal, log)
        if (flag) result.push(log)
    }

    return result
}

function checkIfDateIsLongerThanTheOther (dateInitial, dateFinal, log) {
    const startDate = formatDateWithoutHours(dateInitial)
    const endDate = formatDateWithoutHours(dateFinal)
    const createLog = formatDateWithoutHours(log.createdAt)
    if (startDate <= createLog && endDate >= createLog) return true
    return false
}

function logs (query = {}, dateInitial, dateFinal) {
    return new Promise(async (resolve, reject) => {
        try {
            let skip = 0
            const limit = 100
            let result = []
            let dates = {
                $gte: dateInitial,
                $lte: dateFinal,
            }

            if (dateInitial === dateFinal) {
                dates = {
                    $gte: dateInitial,
                }
            }

            query = {
                ...query,
                createdAt: dates,
            }

            let logs = await Log.find(query).skip(skip).limit(limit)
            while (logs.length > 0) {
                result = result.concat(logs)
                skip += limit
                logs = await Log.find(query).skip(skip).limit(limit)
            }
            resolve(result)
        } catch (error) {
            reject(error)
        }
    })
}
