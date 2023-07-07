/* eslint-disable handle-callback-err */
/* eslint-disable no-async-promise-executor */
const {
    Block,
    User,
    LastLogin,
} = require('./model')
const {
    formatDate,
    getDateToday,
    calculateDiffDate,
} = require('../../utils/functions')
const {
    ldapClient,
    returnIdProfileUser,
    returnIdGroupUser,
} = require('../../utils/auth')

const { Log } = require('../logs/model')
const bcrypt = require('bcryptjs')
const _functions = require('../../utils/functions')
const { Group } = require('../groups/model')
const { CLIENT_ID } = process.env
const kafka = require('../../utils/kafka')
const { Trail } = require('../trails/model')
const config = require('../../../config.json')
const { Tracking } = require('../tracking/model')
const emailTemplate = config.messenger.emailTemplate
require('dotenv').config()

module.exports = {
    checkAmountOfLocks(id) {
        return new Promise(async(resolve, reject) => {
            try {
                const quantity = await Block.find({
                    user: { $eq: id },
                    unblocked: { $eq: false },
                }).countDocuments()

                resolve(quantity)
            } catch (error) {
                reject(error)
            }
        })
    },

    returnLastLoginAttemp(id) {
        return new Promise(async(resolve, reject) => {
            try {
                const block = await Block
                    .find({
                        user: { $eq: id },
                        unblocked: { $eq: false },
                    })

                resolve(block[2].dateTimeBlock)
            } catch (error) {
                reject(error)
            }
        })
    },

    checkLastAttemptTime(dateTimeBlock) {
        return new Promise(async(resolve, reject) => {
            try {
                const lastTimeBlock = formatDate(dateTimeBlock)
                const dateCurrent = getDateToday()
                const resultDiff = calculateDiffDate(dateCurrent, lastTimeBlock, 'minutes')

                resolve(resultDiff)
            } catch (error) {
                reject(error)
            }
        })
    },

    // # Exclusivo para validação no LPAD
    // # TODO: Remover
    signInAndReturnRole(login, password, login2) {
        return new Promise(async(resolve, reject) => {
            try {
                await ldapClient.bind(login, password)
                    // const ldapResponse = await ldapClient.bind('cn=read-only-admin,dc=example,dc=com', 'password')

                const opts = {
                    filter: `(sAMAccountName=${login2})`,
                    scope: 'sub',
                    timeLimit: 30000,
                    attributes: ['memberOf'],
                }

                await ldapClient.search('DC=brasil, DC=latam, DC=cea', opts, function(err, res) {
                    res.on('searchEntry', async function(entry) {
                        const ldapUser = entry.object
                        const groups = ldapUser.memberOf
                        const namesProfiles = []
                        const namesGroups = []

                        for (const p in groups) {
                            const groupsSplit = groups[p].split(',')
                            const cnSplit = groupsSplit[0].split('=')[1]

                            if (cnSplit.indexOf('GL_ACADMODA_PF') >= 0) namesProfiles.push(cnSplit)

                            if (cnSplit.indexOf('GL_ACADMODA_LJ') >= 0 ||
                                cnSplit.indexOf('GL_ACADMODA_EC') >= 0 ||
                                cnSplit.indexOf('GL_APP') >= 0
                            ) namesGroups.push(cnSplit)
                        }

                        const profilesIDS = await returnIdProfileUser(namesProfiles)
                        const groupsIDS = await returnIdGroupUser(namesGroups)

                        resolve({
                            token: {
                                profiles: profilesIDS.result,
                                numbers: profilesIDS.numbers,
                                groups: groupsIDS,
                            },
                            names: namesProfiles.concat(namesGroups),
                        })
                    })

                    res.on('error', function(err) {
                        reject(err)
                    })
                })
            } catch (error) {
                reject(error)
            }
        })
    },

    returnDateSinceFirstLogin(userID) {
        return new Promise(async(resolve, reject) => {
            try {
                const userLastLogin = await LastLogin.find({ user: userID })
                const userFirstLogin = userLastLogin[0].createdAt
                const today = new Date()
                const firstLogin = new Date(userFirstLogin)
                let daysSinceFirstLogin = Math.floor((firstLogin - today) / (24 * 3600 * 1000))
                daysSinceFirstLogin *= -1
                resolve(daysSinceFirstLogin)
            } catch (error) {
                reject(error)
            }
        })
    },

    updateGroupsOfUser(userID, groups) {
        return new Promise(async(resolve, reject) => {
            try {
                await User.findByIdAndUpdate(userID, { groupsAD: groups })
                resolve()
            } catch (error) {
                reject(error)
            }
        })
    },

    updateLastLoginUser(userID) {
        return new Promise(async(resolve, reject) => {
            try {
                const user = await LastLogin.findOne({ user: userID })
                if (user) {
                    await LastLogin.updateOne({ user: userID }, { lastLogin: getDateToday() })
                } else {
                    await LastLogin.create({
                        user: userID,
                        lastLogin: getDateToday(),
                    })
                }
                resolve()
            } catch (error) {
                reject(error)
            }
        })
    },

    lastLoggedInUsers(userID) {
        return new Promise(async(resolve, reject) => {
            try {
                const arrUsers = []
                const users = await LastLogin.find().populate('users')
                for (const user of users) {
                    const diff = calculateDiffDate(getDateToday(), user.lastLogin, 'minutes')
                    if (diff <= 35) arrUsers.push(user)
                }
                resolve(arrUsers)
            } catch (error) {
                reject(error)
            }
        })
    },

    ldapSearch(login, name) {
        return new Promise(async(resolve, reject) => {
            const opts = {
                filter: `(sAMAccountName=${login})`,
                scope: 'sub',
                timeLimit: 30000,
                attributes: ['memberOf'],
            }

            let response = null

            await ldapClient.search('DC=brasil, DC=latam, DC=cea', opts, function(err, res) {
                res.on('searchEntry', function(entry) {
                    entry = entry.object
                    response = entry
                    resolve(response)
                })

                res.on('error', function(err) {
                    reject(err)

                    Log.create({
                        user: null,
                        type: 'CREATE',
                        message: `ROTINA AD - ${name} - ${err.message}`,
                        component: 'CRON_GROUP',
                        dataNew: [],
                        dataOld: [],
                        route: null,
                        ip: null,
                        login: null,
                        groups: [],
                    })
                })

                res.on('end', function(result) {
                    resolve(response)
                })
            })
        })
    },

    processUsersLoad(data) {
        const salt = bcrypt.genSaltSync(10)
        const initialPasswordKey = '1234'
        data.password = [{ 
            hash: bcrypt.hashSync(data?.password ?? initialPasswordKey, salt), 
            valid: true, 
            createdAt: new Date(Date.now()) 
        }]

        data.clientUserKey = CLIENT_ID + '@@' + data.networkLogin
        data.birthDate = _functions.formatDateWithoutHoursBrasilian(data.birthDate)
        data.admission = _functions.formatDateWithoutHoursBrasilian(data.admission)
        data.createDate = _functions.formatDateWithoutHoursBrasilian(data?.createDate ?? new Date())
        data.enabled = true

        const roles = data.roles ? data.roles.split(',').map(item => item.trim()) : []

        const groupsAD = ['PERFIL_Aluno', 'ELEGE_CURSO']
        const targetTags = [
            'office', 
            'vp', 
            'locality',
            'optionalEligibility1',
            'optionalEligibility2',
            'optionalEligibility3'
        ]
        targetTags.forEach(async (tag) => {
            if(!!data[tag]) {
                const value = `ELEGE_${_functions.clearString(data[tag])}`
                groupsAD.push(value)
                const group = await Group.findOne({ name: value })
                if (!group) {
                    await Group.create({ 
                        name: value,
                        tags: [{
                            display: value,
                            value: value
                        }] 
                    })
                }
            } 
        });
        
        const elegibility = !data.company && !data.office ? [] : [
            `ELEGE_${_functions.clearString(data.company)}`,
            `ELEGE_${_functions.clearString(data.office)}`,
        ]

        if (roles.includes('Admin')) {
            groupsAD.push('PERFIL_Admin')
        }

        if (roles.includes('Analista')) {
            groupsAD.push('PERFIL_Analista')
        }
        if (roles.includes('Conteudista')) {
            groupsAD.push('PERFIL_Conteudista')
        }

        elegibility.forEach(async value => {
            if (value) {
                groupsAD.push(value)
                const group = await Group.findOne({ name: value })
                if (!group) {
                    await Group.create({ name: value })
                }
            }
        })
        data.groupsAD = groupsAD
        if (data.cpf) {
            data.cpf = String(data.cpf).replace(/[^a-z0-9]/gi, '')
            data.cpf = _functions.formatNumberCpf(data.cpf)
            data.networkLogin = data.cpf
        }

        return data
    },

    async processUserAccount(data) {
        try {
            const { groupsAD = [] } = data

            let groupsObj = []

            for (const value of groupsAD) {
                const g = await Group.find({ name: value })
                if (g.length > 0) {
                    groupsObj.push(...g)
                }
            }
            groupsObj = groupsObj.map(obj => {
                const tags = obj.tags.map(tag => tag.value)
                const data = { name: obj.name, tags }
                return data
            })

            const account = {
                name: data.name,
                email: data.email ? data.email : null,
                identifier: data.networkLogin,
                clientid: process.env.CLIENT_ID,
                group: groupsObj,
            }
            return { value: JSON.stringify(account) }
        } catch (error) {
            console.log(error)
            return error
        }
    },

    async sendAccountsToKafka(accounts) {
        try {
            const producer = kafka.producer()
            await producer.connect()

            await producer.send({ topic: process.env.TOPIC_ACC, messages: accounts })

            await producer.disconnect()
        } catch (error) {
            console.log(error)
        }
    },

    async getUsersByTrail(trailId, category) {
        try {
            const trail = await Trail.findOne({ _id: trailId })

            const tags = trail.tags

            let groups = []

            for (const tag of tags) {
                const group = await Group.find({ tags: { $in: tag } })
                groups.push(...group)
            }
            groups = groups.map(group => group.name)

            const users = await User.find({ groupsAD: { $in: groups } }, ['networkLogin'])

            const usersToReturn = []
            if (category === 'charge') {
                const items = trail.items.map(item => {
                    return item.itemID._id
                })

                for (const user of users) {
                    let completedTracking = 0
                    const allTrackingUser = await Tracking.find({
                        userLogin: { $eq: user.networkLogin },
                        item: { $in: items },
                    })
                    for (const tracking of allTrackingUser) {
                        if (tracking.completionAt !== null) {
                            completedTracking++
                        }
                    }

                    if (completedTracking !== items.length) {
                        usersToReturn.push(user)
                    }
                }

                return usersToReturn
            } else {
                usersToReturn.push(...users)
                return usersToReturn
            }
        } catch (error) {
            return error
        }
    },

    async getUsersByGroups(groups) {
        try {
            const users = await User.find({ groupsAD: { $in: groups } }, ['networkLogin'])
            return users
        } catch (error) {
            return error
        }
    },

    async getUsersByTags(tags) {
        try {
            let groups = []

            for (const tag of tags) {
                const group = await Group.find({ tags: { $in: tag } })
                groups.push(...group)
            }
            groups = groups.map(group => group.name)

            const users = await User.find({ groupsAD: { $in: groups } }, ['networkLogin'])

            return users
        } catch (error) {
            return error
        }
    },

    async getUsersByIds(ids) {
        try {
            const users = await User.find({ _id: { $in: ids } }, ['networkLogin'])

            return users
        } catch (error) {
            return error
        }
    },

    async sendUpdatedDeviceIdToMessenger(device, identifier) {
        try {
            const producer = kafka.producer()
            await producer.connect()
            const obj = JSON.stringify({ device, identifier })
            await producer.send({ topic: process.env.TOPIC_DEVICER, messages: [{ value: obj }] })

            await producer.disconnect()
        } catch (error) {
            console.log(error)
            throw error
        }
    },

    async createWelcomeCampaign() {
        const title = `Seja bem-vindo(a) à plataforma ${process.env.PROJECT_NAME}!`
        const text = 'Venha conhecer a plataforma!'
        const communication = ['notification']
        const mode = 'automatic'
        const category = 'notify'
        return { title, text, communication, category, mode, ...emailTemplate }
    },
}