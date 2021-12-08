/* eslint-disable no-async-promise-executor */
require('dotenv').config()
const ldap = require('ldapjs')
const jwt = require('jsonwebtoken')
const {
    promisify
} = require('util')
const {
    error
} = require('../utils/logger')
const {
    PROJECT_SECRET_KEY,
    LDAP_HOST,
    ANALYTICS_SECRET_KEY
} = process.env
const {
    Profile
} = require('../components/profiles/model')
const {
    Group
} = require('../components/groups/model')

const _ldapClient = ldap.createClient({
    url: LDAP_HOST,
    timeLimit: 7000,
    reconnect: true,
})
_ldapClient.on('error', err => error('Erro LDAP: %o', err))

module.exports = {
    ldapClient: {
        bind: promisify(_ldapClient.bind).bind(_ldapClient),
        search: promisify(_ldapClient.search).bind(_ldapClient),
        unbind: promisify(_ldapClient.unbind).bind(_ldapClient),
    },

    generateToken: obj => {
        const token = jwt.sign({
                data: obj
            },
            PROJECT_SECRET_KEY, {
                expiresIn: '1h'
            },
        )

        return token
    },

    generateSSOToken: obj => {
        const token = jwt.sign({
                data: obj
            },
            PROJECT_SECRET_KEY, {
                expiresIn: '1h'
            },
        )
        return token
    },

    generateTokenAnalytics: obj => {
        const token = jwt.sign({
                perfil: obj.perfil,
                clientID: obj.clientID,
            },
            ANALYTICS_SECRET_KEY, {
                expiresIn: '12h'
            },
        )

        return token
    },

    decodeToken: token => {
        return jwt.decode(token, PROJECT_SECRET_KEY)
    },

    returnIdProfileUser: profiles => {
        return new Promise(async (resolve, reject) => {
            try {
                const result = []
                const numbers = []

                for (const p in profiles) {
                    const profile = await Profile.findOne({
                        $text: {
                            $search: profiles[p]
                        },
                    })

                    if (profile) {
                        numbers.push(returnNumberOfProfile(profiles[p]))
                        result.push(profile._id)
                    }
                }

                if (result.length > 0) {
                    resolve({
                        result,
                        numbers,
                    })
                } else {
                    reject(new Error('Sem perfil vinculado!'))
                }
            } catch (error) {
                reject(error)
            }
        })
    },

    returnProfileByToken: token => {
        return new Promise(async (resolve, reject) => {
            try {
                const result = []
                const data = jwt.decode(token, PROJECT_SECRET_KEY)
                const profiles = data.data.profiles

                for (const p in profiles) {
                    const profile = await Profile.findOne({
                        _id: {
                            $eq: profiles[p]
                        },
                    })

                    if (profile) result.push(profile.title)
                }

                resolve(result)
            } catch (error) {
                reject(error)
            }
        })
    },

    validateToken: req => {
        return new Promise(resolve => {
            try {
                const token = req.headers.authorization
                jwt.verify(token, PROJECT_SECRET_KEY, function (err) {
                    if (err) {
                        resolve(false)
                    } else {
                        resolve(true)
                    }
                })
            } catch (error) {
                resolve(false)
            }
        })
    },

    validateTokenNginx: token => {
        return new Promise(resolve => {
            try {
                //const token = req.headers.authorization
                jwt.verify(token, PROJECT_SECRET_KEY, function (err) {
                    if (err) {
                        resolve(false)
                    } else {
                        resolve(true)
                    }
                })
            } catch (error) {
                resolve(false)
            }
        })
    },

    returnIdGroupUser(groups) {
        return new Promise(async (resolve, reject) => {
            try {
                const result = []

                for (const p in groups) {
                    const group = await Group.findOne({
                        $text: {
                            $search: groups[p]
                        },
                    })

                    if (group) result.push(group._id)
                }

                resolve(result)
            } catch (error) {
                reject(error)
            }
        })
    },
}

function returnNumberOfProfile(profile) {
    let number
    switch (profile) {
        case 'GL_ACADMODA_PF_INTEGRADOR':
        case 'PERFIL_Integrador':
            number = 1
            break
        case 'GL_ACADMODA_PF_INSTRUTOR':
        case 'PERFIL_Intrutor':
            number = 2
            break
        case 'GL_ACADMODA_PF_ADM':
        case 'PERFIL_Admin':
            number = 3
            break
        case 'GL_ACADMODA_PF_ANALISTA':
        case 'PERFIL_Analista':
            number = 4
            break
        case 'GL_ACADMODA_PF_CONTEUDISTA':
        case 'PERFIL_Conteudista':
            number = 5
            break
        case 'PERFIL_Colaborador':
            number = 6
            break
        case 'PERFIL_Colaborador_Livre':
            number = 7
            break
        default:
            number = 0
            break
    }

    return number
}
