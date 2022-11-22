/* eslint-disable no-async-promise-executor */
const { Section } = require('./model')
const { Tracking } = require('../tracking/model')
const _messages = require('../../utils/messages')
const { populateTrails } = require('../trails/business')
const {
    checkIfTheTrackIsValid,
    filterTrails,
    setTrailMandatory,
    getTagsElegiblesByToken,
    elegiblesContents,
    mandatorySections,
    recentsSections,
    keepLearningSections,
    concludedSections,
    getGroupCodesByToken,
} = require('./business')
const { getUserByToken, processTrailTracking, processExpirationDate } = require('../../utils/functions')

module.exports = {
    async returnSections (req, res) {
        try {
            const searchBy = req.query.searchBy
            const total = await Section.find({
                deleted: { $eq: 0 },
            }).countDocuments()

            const populateTrails = {
                path: 'trails',
                model: 'Trail',
                select: ['_id', 'title', 'thumbPath'],
            }
            const sections = await Section.find(
                searchBy ? {
                    $or: [{ title: { $regex: searchBy, $options: 'i' } }],
                    deleted: { $eq: 0 },
                } : {
                    deleted: { $eq: 0 },
                },
            ).sort({ position: 'asc' }).populate(populateTrails)

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
                    section, [],
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
            console.log(error)
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
                await Section.findByIdAndUpdate(id, { deleted: 1, title: section.title + ':deleted' })
                _messages.success(
                    res,
                    req,
                    'Excluído com sucesso',
                    'Exclusão de dados',
                    'sections',
                    'deleteSection', [], [],
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
            const classGroups = await getGroupCodesByToken(req, tags)
            let resultSections = []

            if (tags.length > 0) {
                const filter = req.query
                let trails = await populateTrails(true, {
                    enabled: true,
                    $or: [{ collaborative: false }, { collaborative: { $exists: false } }],
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

                    if (trail.expirationType) {
                        trail = processExpirationDate(trail, user)
                    }

                    trail = processedTrail.trail
                    for (const tag of trail.tags) {
                        for (const classGroup of classGroups) {
                            if (classGroup.groupCode === tag.value) {
                                trail.classGroup = classGroup
                            }
                        }
                    }
                }

                const arrSections = await elegiblesContents(trails)
                const arrMandatorySections = await mandatorySections(trails, tags)
                const arrRecentsSections = await recentsSections(trails)
                const arrKeepLearningSections = await keepLearningSections(trails)
                const arrConcludedSections = await concludedSections(trails)

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
