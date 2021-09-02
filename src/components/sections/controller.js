/* eslint-disable no-async-promise-executor */
const { Section } = require('./model')
const { Tracking } = require('../tracking/model')
const _messages = require('../../utils/messages')
const { populateTrails } = require('../trails/business')
const {
    checkIfTheTrackIsValid,
    calculateDiffDateTrail,
    filterTrails,
    setTrailMandatory,
    getTagsElegiblesByToken,
} = require('./business')
const { getUserByToken, processTrailTracking, processExpirationDate } = require('../../utils/functions')

module.exports = {
    async returnSections (req, res) {
        try {
            const searchBy = req.query.searchBy
            const total = await Section.find({
                deleted: { $eq: 0 },
            }).countDocuments()

            const sections = await Section.find(
                searchBy
                    ? {
                        $or: [{ title: { $regex: searchBy, $options: 'i' } }],
                        deleted: { $eq: 0 },
                    }
                    : {
                        deleted: { $eq: 0 },
                    },
            ).sort({ position: 'asc' })

            _messages.success(res, req, {
                data: sections,
                total,
            })
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'section',
                '/returnSections',
            )
        }
    },

    async createSection (req, res) {
        try {
            const verify = await Section.find({
                title: { $eq: req.body.title },
            })
            if (verify.length === 0) {
                const section = await Section.create(req.body)
                _messages.success(
                    res,
                    req,
                    section,
                    'Criação de dados',
                    'sections',
                    'createSection',
                    section,
                    [],
                    true,
                    'CREATE',
                )
            } else {
                _messages.badRequest(
                    res,
                    req,
                    'Já existe uma seção cadastrada com esse título!',
                    'Já existe uma seção cadastrada com esse título!',
                    'sections',
                    'createSections',
                )
            }
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'section',
                '/createSession',
            )
        }
    },

    async updateSection (req, res) {
        try {
            const { _id } = req.body
            const verify = await Section.find({
                title: { $eq: req.body.title },
                _id: { $ne: _id },
            })
            if (verify.length === 0) {
                const oldData = await Section.findByIdAndUpdate(_id, req.body)
                const newData = await Section.find({ _id: { $eq: _id } })

                _messages.success(
                    res,
                    req,
                    'Atualizado com sucesso',
                    'Atualização de dados',
                    'sections',
                    'updateSection',
                    newData,
                    oldData,
                    true,
                    'UPDATE',
                )
            } else {
                _messages.badRequest(
                    res,
                    req,
                    'Já existe uma seção cadastrada com esse título!',
                    'Já existe uma seção cadastrada com esse título!',
                    'sections',
                    'updateSections',
                )
            }
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'section',
                '/updateSection',
            )
        }
    },

    async deleteSection (req, res) {
        try {
            const { id } = req.params
            const section = await Section.findById(id)
            if (section.default) {
                _messages.badRequest(
                    res,
                    req,
                    'Não é possível excluir uma sessão obrigatória',
                    'Não é possível excluir uma sessão obrigatória',
                    'section',
                    '/deleteSection',
                )
            } else {
                await Section.findByIdAndUpdate(id, { deleted: 1 })
                _messages.success(
                    res,
                    req,
                    'Excluído com sucesso',
                    'Exclusão de dados',
                    'sections',
                    'deleteSection',
                    [],
                    [],
                    true,
                    'DELETE',
                )
            }
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'section',
                '/deleteSection',
            )
        }
    },

    async getSectionsElegibles (req, res) {
        try {
            const user = await getUserByToken(req)
            const tags = await getTagsElegiblesByToken(req)

            let resultSections = []

            if (tags.length > 0) {
                const filter = req.query
                let trails = await populateTrails(true, {
                    enabled: true,
                    tags: {
                        $in: tags,
                    },
                })
                trails = trails.filter(trail => checkIfTheTrackIsValid(trail))

                const allTrackingUser = await Tracking.find({
                    userLogin: { $eq: user.networkLogin },
                })

                for (let trail of trails) {
                    const processedTrail = processTrailTracking(trail, allTrackingUser)

                    trail = processExpirationDate(trail, user)

                    trail = processedTrail.trail
                }

                const arrSections = await elegiblesContents(
                    user,
                    trails,
                )
                const arrMandatorySections = await mandatorySections(
                    user,
                    trails,
                    tags,
                )
                const arrRecentsSections = await recentsSections(
                    user,
                    trails,
                    tags,
                )
                const arrKeepLearningSections = await keepLearningSections(
                    user,
                    trails,
                    tags,
                )
                const arrConcludedSections = await concludedSections(
                    user,
                    trails,
                    tags,
                )

                resultSections = arrSections
                    .concat(arrMandatorySections)
                    .concat(arrRecentsSections)
                    .concat(arrKeepLearningSections)
                    .concat(arrConcludedSections)
                resultSections = resultSections.filter(val => {
                    return val != null
                })

                if (resultSections.length > 0) {
                    resultSections.sort((a, b) =>
                        a.position < b.position ? -1 : 1,
                    )
                }

                if (filter && Object.values(filter).length > 0) {
                    const arrResultSections = []
                    for (const section of resultSections) {
                        section.trails = filterTrails(
                            filter,
                            section.trails,
                            tags,
                        )
                        if (section.trails.length > 0) {
                            // Verifica a obrigatoriedade da trilha.
                            arrResultSections.push(section)
                        }
                    }

                    resultSections = arrResultSections
                }
                // Seta a obrigatoriedade.
                for (const section of resultSections) {
                    for (const trail of section.trails) {
                        setTrailMandatory(trail, tags)
                    }
                }
            }

            _messages.success(res, req, resultSections)
        } catch (error) {
            console.log(error)
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'sections',
                '/elegiblesContents',
            )
        }
    },

    async updatePosition (req, res) {
        try {
            const sections = req.body

            for (const section of sections) {
                const { id, position } = section
                await Section.findByIdAndUpdate(id, { position })
            }

            _messages.success(res, req, 'Atualizado com sucesso!')
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'sections',
                '/updatePosition',
            )
        }
    },
}

function elegiblesContents (user, trails) {
    return new Promise(async (resolve, reject) => {
        try {
            const arrSections = []
            const arrTrailsIDS = []
            const sectionsIDS = []

            for (const trail of trails) {
                const sections = await Section.find({
                    deleted: 0,
                    active: 1,
                    default: false,
                    tags: { $in: trail.tags },
                })

                for (const section of sections) {
                    var idSec = null
                    for (let i = 0; i < arrSections.length; i++) {
                        if (String(arrSections[i]._id) === String(section._id)) {
                            idSec = i
                            break
                        }
                    }

                    if (idSec == null) {
                        arrSections.push(section)
                        idSec = arrSections.length - 1
                    }

                    const flagValid = checkIfTheTrackIsValid(trail)
                    if (flagValid) {
                        arrSections[idSec].trails.push(trail)

                        const sortFnc =
                            arrSections[idSec] &&
                                arrSections[idSec].ordination !== undefined && arrSections[idSec].ordination === 0
                                ? function (a, b) { return b.createdAt - a.createdAt }
                                : function (a, b) { var x = a.title.toLowerCase(); var y = b.title.toLowerCase(); return x < y ? -1 : x > y ? 1 : 0 }

                        arrSections[idSec].trails.sort(sortFnc)
                    }

                    sectionsIDS.push(section._id.toString())
                }

                arrTrailsIDS.push(trail._id.toString())
            }
            /*
            console.log("***********")
            console.log(arrSections.length)
            console.log("***********")
            for(var sss = 0; sss < arrSections.length; sss++) {
                var sec = arrSections[sss]
                //console.log(sec.title)
                console.log("\t" + sec.title + " > Trilhas: " + sec.trails.length)
                for(var ttt = 0; ttt < sec.trails.length; ttt++) {
                    var traill = sec.trails[ttt];
                    console.log("\t\t" + traill.title + " > Items: " + traill.items.length)
                }
            }

            console.log("***********")
            // */

            resolve(arrSections)
        } catch (error) {
            reject(error)
        }
    })
}

function mandatorySections (user, trails, tags) {
    return new Promise(async (resolve, reject) => {
        try {
            const section = await Section.findOne({
                title: { $eq: 'NECESSÁRIOS PARA VOCÊ' },
                active: 1,
            })
            if (section) {
                const sortFnc =
                    section &&
                        section.ordination !== undefined && section.ordination === 0
                        ? function (a, b) { return b.createdAt - a.createdAt }
                        : function (a, b) { var x = a.title.toLowerCase(); var y = b.title.toLowerCase(); return x < y ? -1 : x > y ? 1 : 0 }

                trails = trails.filter(trail => {
                    const trailItems = trail.items.filter(item =>
                        item.mandatory ? item.mandatory : false,
                    )
                    return trailItems.length > 0
                })

                trails = trails.filter(trail => {
                    for (var m in trail.mandatory) {
                        for (const t in tags) {
                            if (trail.mandatory[m].value === tags[t].value) {
                                return true
                            }
                        }
                    }

                    return false
                })

                trails.sort(sortFnc)

                section.trails = trails
            }

            resolve(trails.length > 0 ? section : [])
        } catch (error) {
            reject(error)
        }
    })
}

function recentsSections (user, trails, tags) {
    return new Promise(async (resolve, reject) => {
        try {
            const section = await Section.findOne({
                title: { $eq: 'NOVIDADES PRA VOCÊ' },
                active: 1,
            })
            if (section) {
                const sortFnc =
                    section &&
                        section.ordination !== undefined && section.ordination === 0
                        ? function (a, b) { return b.createdAt - a.createdAt }
                        : function (a, b) { var x = a.title.toLowerCase(); var y = b.title.toLowerCase(); return x < y ? -1 : x > y ? 1 : 0 }

                for (const trail of trails) {
                    const flag = calculateDiffDateTrail(trail)
                    if (flag) {
                        section.trails.push(trail)
                    }
                }

                section.trails.sort(sortFnc)
            }

            resolve(section && section.trails.length > 0 ? section : [])
        } catch (error) {
            reject(error)
        }
    })
}

function keepLearningSections (user, trails, tags) {
    return new Promise(async (resolve, reject) => {
        try {
            const section = await Section.findOne({
                title: { $eq: 'CONTINUE APRENDENDO' },
                active: 1,
            })
            if (section) {
                const sortFnc =
                    section &&
                        section.ordination !== undefined && section.ordination === 0
                        ? function (a, b) { return b.createdAt - a.createdAt }
                        : function (a, b) { var x = a.title.toLowerCase(); var y = b.title.toLowerCase(); return x < y ? -1 : x > y ? 1 : 0 }

                for (const trail of trails) {
                    if (trail.completion === 0) {
                        section.trails.push(trail)
                    }
                }

                section.trails.sort(sortFnc)
            }

            resolve(section && section.trails.length > 0 ? section : [])
        } catch (error) {
            console.log(error)
            reject(error)
        }
    })
}

function concludedSections (user, trails, tags) {
    return new Promise(async (resolve, reject) => {
        try {
            const section = await Section.findOne({
                title: { $eq: 'CONCLUÍDOS' },
                active: 1,
            })
            if (section) {
                const sortFnc =
                    section &&
                        section.ordination !== undefined && section.ordination === 0
                        ? function (a, b) { return b.createdAt - a.createdAt }
                        : function (a, b) { var x = a.title.toLowerCase(); var y = b.title.toLowerCase(); return x < y ? -1 : x > y ? 1 : 0 }

                for (const trail of trails) {
                    if (trail.completion) {
                        section.trails.push(trail)
                    }
                }

                section.trails.sort(sortFnc)
            }

            resolve(section && section.trails.length > 0 ? section : [])
        } catch (error) {
            console.log(error)
            reject(error)
        }
    })
}
