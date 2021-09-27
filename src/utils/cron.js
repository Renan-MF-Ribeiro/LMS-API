/* eslint-disable no-async-promise-executor */
/* eslint-disable no-new */
require('dotenv').config()
const { CLIENT_ID } = process.env
const CronJob = require('cron').CronJob
const { User, UserTest } = require('../components/users/model')
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
} = require('../components/users/business')

const { getAzureFile, readXLSXUsersBuffer } = require('../utils/files')
const { sendMessageToKafka } = require('../components/messages/business')
const groupingA = process.env.groupA
const groupingB = process.env.groupB

module.exports = {
    updateAverageCourses () {
        new CronJob('*/30 * * * * ', () => {
            averageCourses()
        }, null, true, 'America/Sao_Paulo')
    },

    updateAverageRatings () {
        new CronJob('*/60 * * * * ', () => {
            averageRating()
        }, null, true, 'America/Sao_Paulo')
    },

    sendCourseReleaseNotification () {
        new CronJob('00 10 * * * ', () => {
            courseReleaseCron()
        }, null, true, 'America/Sao_Paulo')
    },

    sendCourseChargeNotification () {
        new CronJob('00 14 * * * ', () => {
            courseChargeCron()
        }, null, true, 'America/Sao_Paulo')
    },

    updateUserTemporaryTags () {
        new CronJob('00 00 * * * ', () => {
            userTemporaryTagsCron()
        }, null, true, 'America/Sao_Paulo')
    },

    executeCronAverageCourses () {
        // userTemporaryTagsCron()
        // averageCourses()
        // averageRating()
        // getUsersLoad()
        // courseChargeCron()
        // courseReleaseCron()
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
        // Busca os usuário e coloca paginação
        const limit = 1000
        let skip = 0
        const usersFinal = []
        let users = await User.find({ status: 'ATIVO' }).limit(limit).skip(skip)

        while (users.length > 0) {
            usersFinal.push(...users)
            skip += limit
            users = await User.find({ status: 'ATIVO' }).limit(limit).skip(skip)
        }

        const groupA = getGroupSet(usersFinal, groupingA)
        const groupB = getGroupSet(usersFinal, groupingB)

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

            let numberTrailsCompleted = 0
            const numberTrailsElegibles = trails.length

            for (const trail of trails) {
                for (const item of trail.items) {
                    const tracking = await Tracking.findOne({
                        item: { $eq: item.itemID._id },
                        userLogin: { $eq: user.networkLogin },
                    })

                    if (tracking) {
                        if (tracking.kind === 'SCORMTracking') {
                            item.completion = isSCORMCompleted(tracking.lessonStatus) ? 1 : 0
                        } else {
                            item.completion = tracking.completion
                        }
                    }
                }

                trail.completion = getTrailCompletion(trail)
                if (getTrailCompletion(trail) === 1) numberTrailsCompleted += 1
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
    const usersLoad = await getAzureFile()
    const users = await readXLSXUsersBuffer(usersLoad)

    for (const user of users) {
        if (user.cpf) {
            const user = await User.findOne({
                cpf: user.cpf,
            })

            const userBirthDate = _functions.formatDateWithoutHoursBrasilian(user.birthDate).replace('/', '').replace('/', '')
            var hashPass = [{ hash: bcrypt.hashSync(userBirthDate, salt), valid: true, createdAt: new Date(Date.now()) }]
            user.password = user ? user.password : hashPass
            user.clientUserKey = CLIENT_ID + '@@' + user.cpf
            user.status = String(user.status).toUpperCase()

            user.createDate = _functions.formatDateWithoutHoursBrasilian(user.createdAt)
            user.birthDate = _functions.formatDateWithoutHoursBrasilian(user.birthDate)
            user.admission = _functions.formatDateWithoutHoursBrasilian(user.admission)
            user.status = user.status.toUpperCase()
            user.networkLogin = user.cpf
            user.enabled = true

            const groupsAD = ['PERFIL_Aluno', 'ELEGE_CURSO']

            if (roles.includes('Admin')) {
                groupsAD.push('PERFIL_Conteudista')
                groupsAD.push('PERFIL_Admin')
                groupsAD.push('PERFIL_Analista')
            }

            if (!roles.includes('Admin') && roles.includes('Analista')) {
                groupsAD.push('PERFIL_Analista')
            }
            if (!roles.includes('Admin') && roles.includes('Conteudista')) {
                groupsAD.push('PERFIL_Conteudista')
            }
            user.groupsAD = groupsAD

            if (user) {
                await User.findByIdAndUpdate(user._id, {
                    ...user,
                })
            } else {
                await User.create({
                    ...user,
                })
            }
        }
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
            for (const user of users) {
                const allTrackingUser = await Tracking.find({
                    userLogin: { $eq: user.networkLogin },
                })

                const processedTrail = processTrailTracking(trail, allTrackingUser)
                trail = processedTrail.trail

                if (trail.completion !== 1) {
                    elegibleUsers.push(user)
                }
            }

            const campaign = createReleaseCampaign(trail)
            sendMessageToKafka(campaign, elegibleUsers)
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
            for (const user of users) {
                const allTrackingUser = await Tracking.find({
                    userLogin: { $eq: user.networkLogin },
                })

                const processedTrail = processTrailTracking(trail, allTrackingUser)
                trail = processedTrail.trail

                trail = processExpirationDate(trail, user)
                const expirationDate = trail.expirationDate.getTime()
                const diff = Math.round((expirationDate - today) / oneDay)
                if (trail.completion !== 1 && diff === 5) {
                    elegibleUsers.push(user)
                }
            }
            const campaign = createChargeCampaign(trail)
            sendMessageToKafka(campaign, elegibleUsers)
        }
    } catch (error) {
        return error
    }
}

function createReleaseCampaign (trail) {
    const title = 'Nova trilha para você!'
    const text = `Venha conhecer a nova trilha ${trail.title}, imperdível!`
    const communication = ['notification']
    const category = 'launch'
    return { title, text, communication, category }
}

function createChargeCampaign (trail) {
    const title = 'Se liga!'
    const text = `A trilha ${trail.title} vence em 5 dias!`
    const communication = ['notification']
    const category = 'launch'
    return { title, text, communication, category }
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
