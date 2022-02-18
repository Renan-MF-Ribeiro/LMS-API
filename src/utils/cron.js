/* eslint-disable no-async-promise-executor */
/* eslint-disable no-new */
require('dotenv').config()
const CronJob = require('cron').CronJob
const { User } = require('../components/users/model')
const { Message } = require('../components/messages/model')
const { Group } = require('../components/groups/model')
const { populateTrails } = require('../components/trails/business')
const { Tracking } = require('../components/tracking/model')

const {
    isSCORMCompleted,
    calculateAverage,
    processTrailTracking,
    processExpirationDate,
    getDateTodayWithoutHours,
    formatDateWithoutHours,
    calculateDiffDate,
    formatNumberCpf,
} = require('./functions')
const {
    getTagsElegibles,
    getTrailCompletion,
} = require('../components/sections/business')
const {
    AverageCourses,
    AverageRating,
    Log,
} = require('../components/logs/model')
const {
    lastLoggedInUsers,
    processUsersLoad,
    sendAccountsToKafka,
    createWelcomeCampaign,
    processUserAccount,
} = require('../components/users/business')

const { getAzureFile, readCSVUsersBuffer, moveUserLoadToProcessed } = require('../utils/files')
const { sendMessageToKafka } = require('../components/messages/business')

const config = require('../../config.json')
const { Item } = require('../components/items/model')
const { HistoricEvaluation } = require('../components/assessments/model')

const emailTemplate = config.messenger.emailTemplate
const groupingA = config.cron.average.groupA
const groupingB = config.cron.average.groupB
const inactivateIfNotInSpreadsheet = config.usersData.inactivateIfNotInSpreadsheet

module.exports = {
    updateAverageCourses () {
        if (config.cron.average.active) {
            new CronJob('*/30 * * * * ', () => {
                averageCourses()
            }, null, true, 'America/Sao_Paulo')
        }
    },

    updateAverageRatings () {
        if (config.cron.average.active) {
            new CronJob('*/60 * * * * ', () => {
                averageRating()
            }, null, true, 'America/Sao_Paulo')
        }
    },

    sendCourseReleaseNotification () {
        if (config.cron.courseRelease.active) {
            new CronJob('00 07 * * * ', () => {
                courseReleaseCron()
            }, null, true, 'America/Sao_Paulo')
        }
    },

    sendCourseChargeNotification () {
        if (config.cron.courseCharge.active) {
            new CronJob('00 08 * * * ', () => {
                courseChargeCron()
            }, null, true, 'America/Sao_Paulo')
        }
    },
    deleteReprovedExamTracking () {
        if (config.cron.deleteReprovedExamTracking.active) {
            new CronJob('00 00 * * * ', () => {
                examTrackingDeleteCron()
            }, null, true, 'America/Sao_Paulo')
        }
    },

    updateUserTemporaryTags () {
        new CronJob('00 00 * * * ', () => {
            userTemporaryTagsCron()
        }, null, true, 'America/Sao_Paulo')
    },
    getUsersLoadCron () {
        if (config.cron.userFTP.active) {
            new CronJob('00 19 * * * ', () => {
                getUsersLoad()
            }, null, true, 'America/Sao_Paulo')
        }
    },
    executeCronAverageCourses () {
        // userTemporaryTagsCron()
        // averageCourses()
        // averageRating()
        // getUsersLoad()
        // courseChargeCron()
        // courseReleaseCron()
        // examTrackingDeleteCron()
    },

    executeCourseReleaseNotification () {
        courseReleaseCron()
    },

    executeCourseChargeNotification () {
        courseChargeCron()
    },
    executeCronUsers () {
        getUsersLoad()
    },
}

async function averageRating () {
    try {
        const limit = 1000
        let skip = 0
        const usersFinal = []
        let users = await User.find({ status: 'ATIVO' }).limit(limit).skip(skip)

        while (users.length > 0) {
            usersFinal.push(...users)
            skip += limit
            users = await User.find({ status: 'ATIVO' }).limit(limit).skip(skip)
        }

        const usersLastLogin = await lastLoggedInUsers()

        const groupA = getGroupSet(usersFinal, groupingA)
        const groupB = getGroupSet(usersFinal, groupingB)

        await ratingCron(groupA, usersLastLogin)
        await ratingCron(groupB, usersLastLogin)

        storageLog('MÉDIAS DAS NOTAS CALCULADAS COM SUCESSO', '', '', 'AVERAGE')
    } catch (error) {
        storageLog('MÉDIAS DAS NOTAS - ' + error.message)
    }
}

function ratingCron (grouping, usersLastLogin) {
    return new Promise(async (resolve, reject) => {
        try {
            for (const g of grouping) {
                let numberUsers = 0
                let numberAverage = 0
                const groupName = `${g.group}`
                const query = { [groupName]: g.value }
                const userGroup = await User.find(query)

                for (const u of userGroup) {
                    const filter = usersLastLogin.filter(val => { return val.user._id.toString() === u._id.toString() })
                    if (filter.length > 0) {
                        const result = await calculateAverage(u)
                        const average = (result.total * 100) / result.max
                        numberAverage += average || 0
                        numberUsers += result.totalOfUsers
                    } else {
                        numberAverage += u.averageRating || 0
                    }
                }

                const max = numberUsers * 100
                const averageStore = max !== 0 ? (numberAverage * 100) / max : 0

                const log = await AverageCourses.findOne({ 'store.group': g.group, 'item.tag': g.value })

                if (log) {
                    await AverageRating.findByIdAndUpdate(log._id, { average: averageStore || 0 })
                } else {
                    await AverageRating.create({
                        store: { group: g.group, tag: g.value },
                        average: averageStore,
                    })
                }
            }
            resolve()
        } catch (error) {
            reject(error)
        }
    })
}

async function averageCourses () {
    try {
        const users = await User.find({ status: 'ATIVO' })

        const groupA = getGroupSet(users, groupingA)
        const groupB = getGroupSet(users, groupingB)

        // Filtra somente os usuários que fizeram login nos últimos 35 minutos
        const usersLastLogin = await lastLoggedInUsers()

        // Call Cron
        await groupCron(usersLastLogin, groupA)
        await groupCron(usersLastLogin, groupB)

        storageLog('MÉDIAS DOS CURSOS CALCULADAS COM SUCESSO', '', '', 'AVERAGE')
    } catch (error) {
        storageLog('MÉDIAS DOS CURSOS - ' - error.message)
    }
}

function getGroupSet (allUsers, group) {
    const data = []
    const grouping = []
    for (const user of allUsers) {
        data.push(user[group])
    }
    const set = [...new Set(data)]

    for (const s of set) {
        grouping.push({ group, value: s })
    }
    return grouping
}

function groupCron (usersLastLogin, grouping) {
    return new Promise(async (resolve, reject) => {
        try {
            for (const g of grouping) {
                let numberTrailsCompletedCompany = 0
                let numberTrailsElegiblesCompany = 0
                const groupName = `${g.group}`
                const query = { [groupName]: g.value }
                const userGroup = await User.find(query)
                for (const user of userGroup) {
                    const filter = usersLastLogin.filter(val => { return user._id.toString() === val.user.toString() })
                    if (filter.length > 0) {
                        const { numberTrailsCompleted, numberTrailsElegibles } = await numberOfCompleteAndEligibleCourses(user)
                        numberTrailsCompletedCompany += numberTrailsCompleted
                        numberTrailsElegiblesCompany += numberTrailsElegibles
                    } else {
                        numberTrailsCompletedCompany += user.numberTrailsCompleted
                        numberTrailsElegiblesCompany += user.numberTrailsElegibles
                    }
                }

                const averageCompanyCourses = numberTrailsElegiblesCompany > 0 ? (numberTrailsCompletedCompany * 100) / numberTrailsElegiblesCompany : 0

                const log = await AverageCourses.findOne({ 'store.group': g.group, 'item.tag': g.value })
                if (log) {
                    await AverageCourses.findByIdAndUpdate(log._id, { average: averageCompanyCourses })
                } else {
                    await AverageCourses.create({
                        average: averageCompanyCourses.toFixed(1),
                        store: { group: g.group, tag: g.value },
                    })
                }
            }
            resolve()
        } catch (error) {
            reject(error)
        }
    })
}

function numberOfCompleteAndEligibleCourses (user) {
    return new Promise(async (resolve, reject) => {
        try {
            const tags = await getTagsElegibles(user)
            const trails = await populateTrails(true, {
                enabled: true,
                tags: { $in: tags },
            })

            const allTrackingUser = await Tracking.find({
                userLogin: { $eq: user.networkLogin },
            })

            let numberTrailsCompleted = 0
            const numberTrailsElegibles = trails.length

            for (let trail of trails) {
                const processedTrail = processTrailTracking(trail, allTrackingUser)

                if (trail.expirationType) {
                    trail = processExpirationDate(trail, user)
                }

                trail = processedTrail.trail

                if (trail.completion === 1) {
                    numberTrailsCompleted++
                }
            }

            resolve({
                numberTrailsCompleted,
                numberTrailsElegibles,
            })
        } catch (error) {
            reject(error)
        }
    })
}

function storageLog (message, dataNew = [], dataOld = [], cronType) {
    Log.create({
        user: null,
        type: 'CREATE',
        message,
        component: cronType ? `CRON_${cronType}` : 'CRON',
        dataNew,
        dataOld,
        route: null,
        ip: null,
        login: null,
        groups: [],
    })
}

async function getUsersLoad () {
    try {
        const usersLoad = await getAzureFile()
        if (usersLoad) {
            const users = await readCSVUsersBuffer(usersLoad.readableStream)
            const newUsers = []
            const existingUsers = []
            const usersToSend = []

            console.log(`Iniciando Processamento de ${users.length} usuários...`)
            for (const user of users) {
                if (user.cpf) {
                    user.cpf = user.cpf.replace(/[^a-z0-9]/gi, '')
                    user.cpf = formatNumberCpf(user.cpf)
                    const existingUser = await User.findOne({
                        cpf: user.cpf,
                    })

                    const processedUser = processUsersLoad(user)
                    const account = await processUserAccount(processedUser)

                    processedUser.password = existingUser ? existingUser.password : processedUser.password

                    if (existingUser) {
                        existingUsers.push({ _id: existingUser._id, processedUser })
                    } else {
                        usersToSend.push(account)
                        newUsers.push(processedUser)
                    }
                }
            }

            console.log(`Usuários processados, iniciando atualizações dos ${existingUsers.length} existentes`)

            const data_start = new Date()
            for (const user of existingUsers) {
                await User.findByIdAndUpdate(user._id, {
                    ...user.processedUser,
                })
            }

            if (inactivateIfNotInSpreadsheet) {
                await User.update({ updatedAt: { $lt: data_start } }, { $set: { status: 'INATIVO' } }, { multi: true })
            }
            if (newUsers.length > 0) {
                console.log(`Usuários existentes atualizados, iniciando criação de ${newUsers.length} novos usuários`)
                await User.insertMany(newUsers)

                if (config.messenger.sendUsersToMicrosservice) {
                    await sendAccountsToKafka(usersToSend)
                    const campaign = createWelcomeCampaign()
                    await sendMessageToKafka(campaign, newUsers)
                    await Message.create(campaign)
                }
            }
            console.log('Novos usuários criados')
            await moveUserLoadToProcessed(usersLoad.buffer)
        }
    } catch (error) {
        console.log(error)
    }
}

async function courseReleaseCron () {
    try {
        const startOfDay = new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString()
        const endOfDay = new Date(new Date().setUTCHours(23, 59, 59, 999)).toISOString()

        const trails = await populateTrails(true, {
            enabled: true,
            createdAt: {
                $gte: startOfDay,
                $lt: endOfDay,
            },
        })

        for (const trail of trails) {
            const tags = trail.tags

            let groups = []

            for (const tag of tags) {
                const group = await Group.find({ tags: { $in: tag } })
                groups.push(...group)
            }
            groups = groups.map(group => group.name)

            const users = await User.find({ groupsAD: { $in: groups } }, ['networkLogin'])
            const items = trail.items.map(item => {
                return item.itemID._id
            })
            const elegibleUsers = []
            for (const user of users) {
                let completedTracking = 0

                const allTrackingUser = await Tracking.find({
                    userLogin: { $eq: user.networkLogin }, item: { $in: items },
                })

                for (const tracking of allTrackingUser) {
                    if (tracking.completionAt !== null) {
                        completedTracking++
                    }
                }

                if (allTrackingUser.length === 0 || completedTracking < items.length) {
                    elegibleUsers.push(user)
                }
            }

            if (elegibleUsers.length > 0) {
                const campaign = createReleaseCampaign(trail)
                await Message.create(campaign)
                sendMessageToKafka(campaign, elegibleUsers)
                storageLog('Campanha de lançamento de cursos enviada', '', '', 'Lançamento')
            }
        }
    } catch (error) {
        return error
    }
}

async function courseChargeCron () {
    try {
        const today = new Date().getTime()
        const oneDay = 1000 * 60 * 60 * 24
        const trails = await populateTrails(true, {
            enabled: true,
            expirationType: { $exists: true },
        })
        for (let trail of trails) {
            const tags = trail.tags

            let groups = []

            for (const tag of tags) {
                const group = await Group.find({ tags: { $in: tag } })
                groups.push(...group)
            }
            groups = groups.map(group => group.name)

            const users = await User.find({ groupsAD: { $in: groups } }, ['networkLogin'])
            const elegibleUsers = []
            const items = trail.items.map(item => {
                return item.itemID._id
            })

            for (const user of users) {
                trail = processExpirationDate(trail, user)
                const expirationDate = trail.expirationDate.getTime()
                const diff = Math.round((expirationDate - today) / oneDay)
                if (diff === 5) {
                    let completedTracking = 0
                    const allTrackingUser = await Tracking.find({
                        userLogin: { $eq: user.networkLogin }, item: { $in: items },
                    })

                    for (const tracking of allTrackingUser) {
                        if (tracking.completionAt !== null) {
                            completedTracking++
                        }
                    }

                    if (allTrackingUser.length === 0 || completedTracking < items.length) {
                        elegibleUsers.push(user)
                    }
                }
            }

            if (elegibleUsers.length > 0) {
                const campaign = createChargeCampaign(trail)
                await Message.create(campaign)
                sendMessageToKafka(campaign, elegibleUsers)
                storageLog('Campanha de cobrança de cursos enviada', '', '', 'Cobrança')
            }
        }
    } catch (error) {
        return error
    }
}

async function examTrackingDeleteCron () {
    try {
        const today = new Date()
        const users = await User.find({ status: 'ATIVO' })
        for (const user of users) {
            const trackings = await Tracking.find({ userLogin: user.networkLogin, kind: 'ExamTracking', lessonStatus: 'failed' })
            for (const tr of trackings) {
                const daysSinceReproval = Math.floor((today - tr.completionAt) / (24 * 3600 * 1000))
                if (daysSinceReproval >= 30) {
                    await HistoricEvaluation.deleteMany({ item: tr.item, user: user._id })
                    await Tracking.deleteMany({ item: tr.item, userLogin: user.networkLogin })
                }
            }
        }
    } catch (error) {
        return error
    }
}

function createReleaseCampaign (trail) {
    const title = `Conheça a nova trilha ${trail.title}`
    const text = `A trilha ${trail.title} acabou de ser lançada, clique para visualizar!`
    const communication = ['notification']
    const mode = 'automatic'
    const category = 'launch'
    const target = { trailid: trail._id, url: `${process.env.DOMAIN}/#/login/entrar?redirectTo=/menu/${trail._id}` }
    return { title, text, communication, category, target, mode, ...emailTemplate }
}

function createChargeCampaign (trail) {
    const title = `Ei, faltam 5 dias para você concluir a trilha ${trail.title}!`
    const text = `Você ainda não completou a trilha ${trail.title}! O prazo para a conclusão é até o dia ${trail.expirationDate}. Por favor, clique para visualizar!`
    const communication = ['notification']
    const category = 'charge'
    const mode = 'automatic'
    const target = { trailid: trail._id, url: `${process.env.DOMAIN}/#/login/entrar?redirectTo=/menu/${trail._id}` }
    return { title, text, communication, category, target, mode, ...emailTemplate }
}

async function userTemporaryTagsCron () {
    try {
        const users = await User.find({ status: 'ATIVO' })
        for (const user of users) {
            if (user.tags.length > 0) {
                const today = getDateTodayWithoutHours()

                user.tags = user.tags.filter(tag => {
                    const diff = calculateDiffDate(today, formatDateWithoutHours(tag.createdAt), 'days')
                    return diff <= 30
                })
                await User.updateOne({ _id: user._id }, { tags: user.tags })
            }
        }
    } catch (error) {
        return error
    }
}
