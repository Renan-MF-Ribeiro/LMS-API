/* eslint-disable no-async-promise-executor */
/* eslint-disable no-new */
require('dotenv').config()
const { CLIENT_ID } = process.env
const CronJob = require('cron').CronJob
const { User, UserTest } = require('../components/users/model')
const { Trail } = require('../components/trails/model')
const { populateTrails } = require('../components/trails/business')
const { Tracking } = require('../components/tracking/model')
const {
    isSCORMCompleted,
    calculateAverage,
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

module.exports = {
    updateAverageCourses() {
        new CronJob('*/30 * * * * ', () => {
            averageCourses()
        }, null, true, 'America/Sao_Paulo')
    },

    updateAverageRatings() {
        new CronJob('*/60 * * * * ', () => {
            averageRating()
        }, null, true, 'America/Sao_Paulo')
    },
    executeCronAverageCourses() {
        averageCourses()
        averageRating()
        // getUsersLoad()
    },
}

async function averageRating() {
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

        const companies = getCompanySet(usersFinal)
        const costCenters = getCostCenters(usersFinal)

        await companyRatingCron(companies, usersLastLogin)
        await costCenterRatingCron(costCenters, usersLastLogin)

        storageLog('MÉDIAS DAS NOTAS CALCULADAS COM SUCESSO', '', '', 'AVERAGE')
    } catch (error) {
        storageLog('MÉDIAS DAS NOTAS - ' + error.message)
    }
}

function companyRatingCron(companies, usersLastLogin) {
    return new Promise(async (resolve, reject) => {
        try {
            for (const p in companies) {
                let numberUsers = 0
                let numberAverage = 0

                const users = await User.find({
                    store: { $eq: companies[p] },
                })

                for (const u of users) {
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

                const storeLog = await AverageRating.findOne({ "store.type": { $eq: "company" }, "item.tag": { $eq: companies[p] } })

                if (storeLog) {
                    await AverageRating.findByIdAndUpdate(storeLog._id, { average: averageStore || 0 })
                } else {
                    await AverageRating.create({
                        store: { type: 'company', tag: companies[p] },
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

function costCenterRatingCron(costCenters, usersLastLogin) {
    return new Promise(async (resolve, reject) => {
        try {
            for (const p in costCenters) {
                let numberUsers = 0
                let numberAverage = 0

                const users = await User.find({
                    store: { $eq: costCenters[p] },
                })

                for (const u of users) {
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
                const averageStore = (numberAverage * 100) / max

                const storeLog = await AverageRating.findOne({ "store.type": { $eq: "costCenter" }, "item.tag": { $eq: costCenters[p] } })

                if (storeLog) {
                    await AverageRating.findByIdAndUpdate(storeLog._id, { average: averageStore || 0 })
                } else {
                    await AverageRating.create({
                        store: { type: 'costCenter', tag: costCenters[p] },
                        average: averageStore || 0,
                    })
                }
            }
            resolve()
        } catch (error) {
            reject(error)
        }
    })
}


async function averageCourses() {
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

        const companies = getCompanySet(usersFinal)
        const costCenters = getCostCenters(usersFinal)

        // Filtra somente os usuários que fizeram login nos últimos 35 minutos
        const usersLastLogin = await lastLoggedInUsers()

        // Call Cron
        await companyCron(usersLastLogin, companies)
        await costCenterCron(usersLastLogin, costCenters)

        storageLog('MÉDIAS DOS CURSOS CALCULADAS COM SUCESSO', '', '', 'AVERAGE')
    } catch (error) {
        storageLog('MÉDIAS DOS CURSOS - ' - error.message)
    }
}

function getCompanySet(allUsers) {
    const arrCompanies = []
    for (const user of allUsers) {
        arrCompanies.push(user.company)
    }
    return [...new Set(arrCompanies)]
}

function getCostCenters(allUsers) {
    const arrCostCenters = []
    for (const user of allUsers) {
        arrCostCenters.push(user.costCenterDescription)
    }
    return [...new Set(arrCostCenters)]
}

function companyCron(usersLastLogin, companies) {
    return new Promise(async (resolve, reject) => {
        try {
            for (const p in companies) {
                let numberTrailsCompletedCompany = 0
                let numberTrailsElegiblesCompany = 0
                const userCompanies = await User.find({ company: { $eq: companies[p] } })
                for (const user of userCompanies) {
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

                const storeLog = await AverageCourses.findOne({ "store.type": { $eq: "company" }, "item.tag": { $eq: companies[p] } })
                if (storeLog) {
                    await AverageCourses.findByIdAndUpdate(storeLog._id, { average: averageCompanyCourses })
                } else {
                    await AverageCourses.create({
                        average: averageCompanyCourses.toFixed(1),
                        store: { type: 'company', tag: companies[p] },
                    })
                }
            }
            resolve()
        } catch (error) {
            reject(error)
        }
    })
}

function costCenterCron(usersLastLogin, costCenters) {
    return new Promise(async (resolve, reject) => {
        try {
            for (const p in costCenters) {
                let numberTrailsCompletedSchoolYear = 0
                let numberTrailsElegiblesSchoolYear = 0
                const userSchoolYears = await User.find({ escola: { $eq: costCenters[p] } })

                for (const user of userSchoolYears) {
                    const filter = usersLastLogin.filter(val => { return user._id.toString() === val.user.toString() })
                    if (filter.length > 0) {
                        const { numberTrailsCompleted, numberTrailsElegibles } = await numberOfCompleteAndEligibleCourses(user)
                        numberTrailsCompletedSchoolYear += numberTrailsCompleted
                        numberTrailsElegiblesSchoolYear += numberTrailsElegibles
                    } else {
                        numberTrailsCompletedSchoolYear += user.numberTrailsCompleted
                        numberTrailsElegiblesSchoolYear += user.numberTrailsElegibles
                    }
                }

                const averageSchoolYearCourses = numberTrailsElegiblesSchoolYear > 0 ? (numberTrailsCompletedSchoolYear * 100) / numberTrailsElegiblesSchoolYear : 0
                const storeLog = await AverageCourses.findOne({ "store.type": { $eq: "costCenter" }, "item.tag": { $eq: costCenters[p] } })

                if (storeLog) {
                    await AverageCourses.findByIdAndUpdate(storeLog._id, { average: averageSchoolYearCourses })
                } else {
                    await AverageCourses.create({
                        average: averageSchoolYearCourses.toFixed(1),
                        store: { type: 'costCenter', tag: costCenters[p] },
                    })
                }
            }
            resolve()
        } catch (error) {
            reject(error)
        }
    })
}

function numberOfCompleteAndEligibleCourses(user) {
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


function storageLog(message, dataNew = [], dataOld = [], cronType) {
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

async function getUsersLoad() {
    const usersLoad = await getAzureFile()
    const users = await readXLSXUsersBuffer(usersLoad)
    console.log(users);

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
                groupsAD.push("PERFIL_Conteudista")
                groupsAD.push("PERFIL_Admin")
                groupsAD.push("PERFIL_Analista")
            }
            
            if (!roles.includes('Admin') && roles.includes('Analista')) {
                groupsAD.push("PERFIL_Analista")
            }
            if (!roles.includes('Admin') && roles.includes('Conteudista')) {
                groupsAD.push("PERFIL_Conteudista")
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
