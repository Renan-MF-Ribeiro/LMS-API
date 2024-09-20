/* eslint-disable no-async-promise-executor */
const { Section, DEFAULT_TYPES } = require('./model');
const { Tracking } = require('../tracking/model');
const { Channel } = require('../channels/model');
const _messages = require('../../utils/messages');
const { populateTrails } = require('../trails/business');
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
    favoriteSections,
    mostSeenSections,
    getGroupCodesByToken,
    checkEligibilityTagsAnd,
    courseInSections,
    getTrainingDataFromBody,
    setAssessmentHistoricOnSections
} = require('./business');

const { getStudentCourses } = require('../home/business');
const {
    getUserByToken,
    processTrailTracking,
    processExpirationDate,
    findObjectInRange,
} = require('../../utils/functions');
const { TrailsUsersProgress, Trail } = require('../trails/model');

module.exports = {
    async returnSections (req, res) {
        try {
            const searchBy = req.query.searchBy;
            const total = await Section.find({
                deleted: { $eq: 0 },
            }).countDocuments();

            const populateTrails = {
                path: 'trails',
                model: 'Trail',
                select: ['_id', 'title', 'thumbPath'],
            };
            const sections = await Section.find(
                searchBy
                    ? {
                        $or: [{ title: { $regex: searchBy, $options: 'i' } }],
                        deleted: { $eq: 0 },
                    }
                    : {
                        deleted: { $eq: 0 },
                    }
            )
                .sort({ position: 'asc' })
                .populate(populateTrails);

            _messages.success(res, req, {
                data: sections,
                total,
            });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'section',
                '/returnSections'
            );
        }
    },

    async createSection (req, res) {
        try {
            const verify = await Section.find({
                title: { $eq: req.body.title },
            });
            if (verify.length === 0) {
                const position = await Section.find({ deleted: 0 }).count();

                const section = await Section.create({
                    ...req.body,
                    position,
                    ...getTrainingDataFromBody(req.body)
                });

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
                    'CREATE'
                );
            } else {
                _messages.badRequest(
                    res,
                    req,
                    'Já existe uma seção cadastrada com esse título!',
                    'Já existe uma seção cadastrada com esse título!',
                    'sections',
                    'createSections'
                );
            }
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'section',
                '/createSession'
            );
        }
    },

    async updateSection (req, res) {
        try {
            const { _id } = req.body;
            const verify = await Section.find({
                title: { $eq: req.body.title },
                _id: { $ne: _id },
            });
            if (verify.length === 0) {
                const oldData = await Section.findByIdAndUpdate(_id, {
                    ...req.body,
                    ...getTrainingDataFromBody(req.body)
                });

                const newData = await Section.find({ _id: { $eq: _id } });

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
                    'UPDATE'
                );
            } else {
                _messages.badRequest(
                    res,
                    req,
                    'Já existe uma seção cadastrada com esse título!',
                    'Já existe uma seção cadastrada com esse título!',
                    'sections',
                    'updateSections'
                );
            }
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'section',
                '/updateSection'
            );
        }
    },

    async deleteSection (req, res) {
        try {
            const { id } = req.params;
            const section = await Section.findById(id);
            if (section.default) {
                _messages.badRequest(
                    res,
                    req,
                    'Não é possível excluir uma sessão obrigatória',
                    'Não é possível excluir uma sessão obrigatória',
                    'section',
                    '/deleteSection'
                );
            } else {
                await Section.findByIdAndUpdate(id, {
                    deleted: 1,
                    title: section.title + ':deleted',
                });
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
                    'DELETE'
                );
            }
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'section',
                '/deleteSection'
            );
        }
    },

    async getSectionsElegibles (req, res) {
        try {
            const { trailLimit: queryTrailLimit = '25', channel: channelId, ...filter } = req.query;

            const trailLimit = queryTrailLimit ? Number(queryTrailLimit) : null;

            const user = await getUserByToken(req);
            const tags = await getTagsElegiblesByToken(req);
            const classGroups = await getGroupCodesByToken(req, tags);
            const newArray = [];
            let sectionArray;

            if (channelId) {
                let { idSections } = await Channel.findById(channelId).select('idSections -_id');

                const sectionInfos = await Section.find({ _id: { $in: idSections } })
                    .select(
                        'trails -_id'
                    )
                    .populate({
                        path: 'trails',
                        model: Trail,
                        select: 'tags tagsAnd _id collaborative',
                    });

                const trailsInSections = sectionInfos.map(({ trails }) => {
                    return {
                        trails: trails.filter(
                            (trail) => checkEligibilityTagsAnd(tags, trail.tagsAnd, trail.tags) && !trail.collaborative
                        ).map(trail => trail._id).slice(0, trailLimit)
                    }
                });

                newArray.push(
                    ...trailsInSections
                        .map((e) => {
                            return e.trails;
                        })
                        .flat(2)
                );

                delete req.query.channel;
                sectionArray = idSections;
            }

            let resultSections = [];

            if (tags.length > 0) {
                const query = {
                    enabled: true,
                    $or: [
                        {
                            tags: {
                                $in: tags,
                            },
                        },
                        {
                            tagsAnd: {
                                $in: tags,
                            },
                        },
                    ],
                };

                if (channelId) {
                    query['_id'] = { $in: newArray };
                }

                let trails = await populateTrails(true, query);
                console.log('Total de trilhas:', trails.length);

                trails = trails.filter((trail) => checkIfTheTrackIsValid(trail));

                const allTrackingUser = await Tracking.find({
                    userLogin: { $eq: user.networkLogin },
                    $or: [
                        { expiredCompletion: { $exists: false } },
                        { expiredCompletion: { $eq: null } },
                    ],
                });

                for (let trail of trails) {
                    const processedTrail = processTrailTracking(trail, allTrackingUser);

                    if (trail.expirationType) {
                        trail = processExpirationDate(trail, user);
                    }

                    trail = processedTrail.trail;

                    for (const tag of trail.tags) {
                        for (const classGroup of classGroups) {
                            if (classGroup.groupCode === tag.value) {
                                trail.classGroup = findObjectInRange(
                                    classGroups.filter((e) => e.groupCode == tag.value),
                                    new Date()
                                );
                            }
                        }
                    }
                }

                let arrSections = await elegiblesContents(trails);
                const arrMandatorySections = await mandatorySections(trails, tags);
                const arrRecentsSections = await recentsSections(trails);
                const arrKeepLearningSections = await keepLearningSections(trails);
                const arrConcludedSections = await concludedSections(trails);
                const arrFavoriteSections = await favoriteSections(trails, user._id);
                const arrMostSeenSections = await mostSeenSections(trails);
                const arrCoursesSections = await courseInSections(tags, user._id);

                function limitArray (section) {
                    if (!section) return [];

                    if (!trailLimit) return section;

                    if (Array.isArray(section) && section.length > 0) {
                        return section.map((section) => {
                            return {
                                ...section,
                                trails: section.trails?.slice(0, trailLimit) ?? []
                            };
                        })
                    }

                    return {
                        ...section,
                        trails: section.trails?.slice(0, trailLimit) ?? []
                    };
                }

                resultSections = arrSections
                    .concat(limitArray(arrMandatorySections))
                    .concat(limitArray(arrRecentsSections))
                    .concat(limitArray(arrKeepLearningSections))
                    .concat(limitArray(arrConcludedSections))
                    .concat(limitArray(arrCoursesSections))
                    .concat(limitArray(arrFavoriteSections))
                    .concat(limitArray(arrMostSeenSections));

                if (channelId) {
                    const filteredArray = resultSections.filter((obj) =>
                        obj ? sectionArray.includes(obj._id) : false
                    );
                    resultSections = filteredArray;
                }

                resultSections = resultSections.filter((val) => {
                    return val != null;
                });

                if (resultSections.length > 0) {
                    resultSections.sort((a, b) => (a.position < b.position ? -1 : 1));
                }

                if (filter && Object.values(filter).length > 0) {
                    const arrResultSections = [];
                    for (const section of resultSections) {
                        section.trails = filterTrails(filter, section.trails, tags);
                        if (section.trails.length > 0) {
                            // Verifica a obrigatoriedade da trilha.
                            arrResultSections.push(section);
                        }
                    }

                    resultSections = arrResultSections;
                }

                for (const section of resultSections) {
                    for (const trail of section.trails) {
                        setTrailMandatory(trail, tags);
                    }
                }
            }

            const hasSomeTrainingSection = resultSections.some(section => section.isTraining);

            if (hasSomeTrainingSection) {
                await setAssessmentHistoricOnSections(user._id, resultSections);
            }

            _messages.success(res, req, resultSections);
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'sections',
                '/elegiblesContents'
            );
        }
    },

    async getSectionDetail (req, res) {
        const sectionId = req.params.id;

        const user = await getUserByToken(req);
        const tags = await getTagsElegiblesByToken(req);
        const classGroups = await getGroupCodesByToken(req, tags);

        const section = await Section.findById(sectionId).lean();

        if (!section) {
            _messages.notFound(res, req, 'Seção não encontrada');
            return;
        }

        const query = { enabled: true };

        if (Object.values(DEFAULT_TYPES).includes(section.defaultType)) {
            query.$or = [
                {
                    tags: {
                        $in: tags,
                    },
                },
                {
                    tagsAnd: {
                        $in: tags,
                    },
                },
            ]
        } else {
            query._id = { $in: section.trails };
        }

        const trailsDb = (await populateTrails(true, query))
            ?.filter(trail => checkEligibilityTagsAnd(tags, trail.tagsAnd, trail.tags) && !trail.collaborative)
            ?.filter((trail) => checkIfTheTrackIsValid(trail))

        const allTrackingUser = await Tracking.find({
            userLogin: { $eq: user.networkLogin },
            $or: [
                { expiredCompletion: { $exists: false } },
                { expiredCompletion: { $eq: null } },
            ],
        });

        const trails = trailsDb.map((trail) => {
            const processedTrail = processTrailTracking(trail, allTrackingUser);

            if (trail.expirationType) {
                trail = processExpirationDate(trail, user);
            }

            const newTrail = processedTrail.trail;

            for (const tag of newTrail?.tags ?? []) {
                for (const classGroup of classGroups) {
                    if (classGroup.groupCode === tag.value) {
                        trail.classGroup = findObjectInRange(
                            classGroups.filter((e) => e.groupCode == tag.value),
                            new Date()
                        );
                    }
                }
            }

            return newTrail;
        });

        let responseSection;

        function setResponse (fnResponse) {
            if (Array.isArray(fnResponse)) {
                return fnResponse.find((e) => String(e._id) === String(section._id))
                    ?? { ...section, trails: [] };
            }

            return { ...section, trails: fnResponse?.trails ?? [] };
        }

        switch (section.defaultType) {
            case DEFAULT_TYPES.MANDATORY:
                const mandatorySectionsResult = await mandatorySections(trails, tags);
                responseSection = setResponse(mandatorySectionsResult);
                break;
            case DEFAULT_TYPES.RECENTS:
                const recentSectionsResult = await recentsSections(trails);
                responseSection = setResponse(recentSectionsResult);
                break;
            case DEFAULT_TYPES.KEEP_LEARNING:
                const keepLearningSectionsResult = await keepLearningSections(trails);
                responseSection = setResponse(keepLearningSectionsResult);
                break;
            case DEFAULT_TYPES.CONCLUDED:
                const concludedSectionsResult = await concludedSections(trails);
                responseSection = setResponse(concludedSectionsResult);
                break;
            case DEFAULT_TYPES.COURSES:
                const coursesSectionsResult = await courseInSections(tags, user._id);
                responseSection = setResponse(coursesSectionsResult);
                break;
            case DEFAULT_TYPES.FAVORITES:
                const favoriteSectionsResult = await favoriteSections(trails, user._id);
                responseSection = setResponse(favoriteSectionsResult);
                break;
            case DEFAULT_TYPES.MOST_SEEN:
                console.log('MOST_SEEN', trails)
                const mostSeenSectionsResult = await mostSeenSections(trails);
                responseSection = setResponse(mostSeenSectionsResult);
                break;
            default:
                responseSection = { ...section, trails };
                break;
        }

        if (!responseSection) {
            res.status(404).json('Seção não encontrada ou inelegível');
            return;
        }

        if (responseSection.isTraining) {
            await setAssessmentHistoricOnSections(user._id, [responseSection]);
        }

        res.json(responseSection);
    },

    async getSectionsFormation (req, res) {
        try {
            const searchBy = req.query.searchBy;
            const query = searchBy
                ? {
                    $or: [{ title: { $regex: searchBy, $options: 'i' } }],
                    deleted: { $eq: 0 },
                    formation: { $eq: 1 },
                }
                : {
                    deleted: { $eq: 0 },
                    formation: { $eq: 1 },
                }

            const populateTrails = {
                path: 'trails',
                model: 'Trail',
                select: ['_id', 'title',],
            };

            const sections = await Section
                .find(query)
                .sort({ position: 'asc' })
                .select({ _id: 1, title: 1, trails: 1 })
                .populate(populateTrails);

            _messages.success(res, req, sections);
        } catch (error) {
            console.error(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'sections',
                '/formation'
            );
        }
    },

    async getSectionsElegiblesNew (req, res) {
        try {
            const user = await getUserByToken(req);
            const tags = await getTagsElegiblesByToken(req);
            const classGroups = await getGroupCodesByToken(req, tags);
            const channelId = req.query.channel;
            const newArray = [];
            let sectionArray;
            if (channelId) {
                const { idSections } = await Channel.findById(channelId).select('idSections -_id');
                const trailsInSections = await Section.find({ _id: { $in: idSections } }).select(
                    'trails -_id'
                );
                newArray.push(...trailsInSections.map((e) => e.trails).flat(2));
                delete req.query.channel;
                sectionArray = idSections;
            }

            let resultSections = [];
            if (tags.length > 0) {
                const filter = req.query;

                const query = {
                    enabled: true,
                    $or: [
                        {
                            tags: {
                                $in: tags,
                            },
                        },
                        {
                            tagsAnd: {
                                $in: tags,
                            },
                        },
                    ],
                    ...(!!channelId && { _id: { $in: newArray } })
                };

                let trails = await TrailsUsersProgress.find(query).lean();
                trails = trails.filter(
                    (trail) =>
                        checkEligibilityTagsAnd(tags, trail.tagsAnd, trail.tags) &&
                        !trail.collaborative
                );

                trails = trails.filter((trail) => checkIfTheTrackIsValid(trail));
                trails = trails.map((trail) => {
                    if (trail.expirationType) {
                        trail = processExpirationDate(trail, user);
                    }

                    for (const tag of trail.tags) {
                        for (const classGroup of classGroups) {
                            if (classGroup.groupCode === tag.value) {
                                trail.classGroup = findObjectInRange(
                                    classGroups.filter((e) => e.groupCode == tag.value),
                                    new Date()
                                );
                            }
                        }
                    }
                    trail.completionPercentage = trail?.trackings?.find((tracking) => {
                        return tracking.networkLogin === user.networkLogin
                    })?.completionPercentage

                    delete trail.trackings

                    return trail
                })

                let arrSections = await elegiblesContents(trails);

                const arrMandatorySections = await mandatorySections(trails, tags);
                const arrRecentsSections = await recentsSections(trails);
                const arrKeepLearningSections = await keepLearningSections(trails);
                const arrConcludedSections = await concludedSections(trails);
                const arrFavoriteSections = await favoriteSections(trails, user._id);

                const arrCoursesSections = await courseInSections(tags, user._id);
                resultSections = arrSections
                    .concat(arrMandatorySections)
                    .concat(arrRecentsSections)
                    .concat(arrKeepLearningSections)
                    .concat(arrConcludedSections)
                    .concat(arrCoursesSections)
                    .concat(arrFavoriteSections);

                if (channelId) {
                    const filteredArray = resultSections.filter((obj) =>
                        obj ? sectionArray.includes(obj._id) : false
                    );
                    resultSections = filteredArray;
                }

                resultSections = resultSections.filter((val) => {
                    return val != null;
                });

                if (resultSections.length > 0) {
                    resultSections.sort((a, b) => (a.position < b.position ? -1 : 1));
                }

                if (filter && Object.values(filter).length > 0) {
                    const arrResultSections = [];
                    for (const section of resultSections) {
                        section.trails = filterTrails(filter, section.trails, tags);
                        if (section.trails.length > 0) {
                            // Verifica a obrigatoriedade da trilha.
                            arrResultSections.push(section);
                        }
                    }

                    resultSections = arrResultSections;
                }

                for (const section of resultSections) {
                    for (const trail of section.trails) {
                        setTrailMandatory(trail, tags);
                    }
                }
            }

            _messages.success(res, req, resultSections);
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'sections',
                '/elegiblesContents'
            );
        }
    },

    async updatePosition (req, res) {
        try {
            const sections = req.body;

            for (const section of sections) {
                const { id, position } = section;
                await Section.findByIdAndUpdate(id, { position });
            }

            _messages.success(res, req, 'Atualizado com sucesso!');
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'sections',
                '/updatePosition'
            );
        }
    },
};
