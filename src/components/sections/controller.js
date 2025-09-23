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
    setAssessmentHistoricOnSections,
    populateSectionTrails,
    getSectionTrailId,
    isSectionTrailInfo,
    isValidSectionTrailInfo,
    recommendedTrailsSections,
    recommendedCoursesSections
} = require('./business');

const { getStudentCourses } = require('../home/business');
const {
    getUserByToken,
    processTrailTracking,
    processExpirationDate,
    findObjectInRange,
    getDateTodayWithoutHours,
    processTrailTrackingV2,
} = require('../../utils/functions');
const { TrailsUsersProgress, Trail } = require('../trails/model');
const { handleSegmentationOnQuery, handleSegmentationOnCreate } = require('../config/business');
const ApiError = require('../../errors/ApiError');
const { matricesApi } = require('../matrices/http-adapter');

const { ObjectId } = require('mongoose').Types;

function parseSectionBodyTrails(req) {
    return req.body.trails?.map(trail => {
        const trailId = getSectionTrailId(trail);

        if (trailId) {
            if (typeof trailId === 'string') {
                return new ObjectId(trailId);
            }

            return {
                ...trail,
                _id: new ObjectId(trailId),
            };
        }

        return trail;
    }) ?? [];
}

async function fetchMatricesData(authorization, userId) {
    try {
        const { data } = await matricesApi.get(`/users/${userId}`, {
            headers: {
                authorization: `Bearer ${authorization}`,
            },
        });

        return {
            recommendedTrails: data.data.recommendedTrails ?? [],
            recommendedCourses: data.data.recommendedCourses ?? [],
        };
    } catch (error) {
        // console.log({ error })
    }
}

module.exports = {
    async returnSections(req, res) {
        try {
            const searchBy = req.query.searchBy;

            const query = {
                $and: [{
                    deleted: { $eq: 0 }
                }]
            }

            if (req?.segmentation) {
                handleSegmentationOnQuery(req, 'owner', query)
            }

            const total = await Section.find(query).countDocuments();

            if (searchBy) {
                query.$and.push({
                    $or: [{ title: { $regex: searchBy, $options: 'i' } }]
                })
            }

            const sections = await populateSectionTrails(
                await Section.find(query)
                    .sort({ position: 'asc' }),
                { select: ['_id', 'title', 'thumbPath'] }
            );

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

    async createSection(req, res) {
        try {
            const verify = await Section.find({
                title: { $eq: req.body.title },
            });
            if (verify.length === 0) {
                const query = {
                    $and: [{
                        deleted: 0
                    }]
                }

                if (req?.segmentation) {
                    handleSegmentationOnQuery(req, 'owner', query)
                    await handleSegmentationOnCreate(req)
                }

                const position = await Section.find(query).count();

                const section = await Section.create({
                    ...req.body,
                    position,
                    ...getTrainingDataFromBody(req.body),
                    trails: parseSectionBodyTrails(req),
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
            console.error(error)
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

    async updateSection(req, res) {
        try {
            const { _id } = req.body;
            const verify = await Section.find({
                title: { $eq: req.body.title },
                _id: { $ne: _id },
            });
            if (verify.length === 0) {
                const oldData = await Section.findByIdAndUpdate(_id, {
                    ...req.body,
                    ...getTrainingDataFromBody(req.body),
                    trails: parseSectionBodyTrails(req),
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

    async deleteSection(req, res) {
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
                    section,
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

    async getSectionsElegibles(req, res) {
        const { trailLimit: queryTrailLimit = '25', channel: channelId, networkLogin, ...filter } = req.query;

        const trailLimit = queryTrailLimit ? Number(queryTrailLimit) : null;

        const tags = await getTagsElegiblesByToken(req);

        if (!tags?.length) {
            _messages.success(res, req, []);
            return;
        }

        const [user, classGroups] = await Promise.all([
            getUserByToken(req),
            getGroupCodesByToken(req, tags)
        ]);

        const now = new Date();

        const classGroupsMap = new Map();
        for (const classGroup of classGroups) {
            if (!classGroupsMap.has(classGroup.groupCode)) {
                classGroupsMap.set(classGroup.groupCode, []);
            }
            classGroupsMap.get(classGroup.groupCode).push(classGroup);
        }

        let trailsIdArr = [];
        let sectionsIdArr = [];
        let sectionInfos = [];

        if (channelId) {
            let { idSections } = await Channel.findById(channelId).select('idSections -_id');

            const dbSections = await Section.find({ _id: { $in: idSections }, active: 1 });

            sectionInfos = await populateSectionTrails(
                dbSections,
                { select: 'tags tagsAnd _id collaborative' }
            );

            const trailsInSections = sectionInfos.map(({ trails }) => {
                return {
                    trails: trails.filter(
                        (trail) => checkEligibilityTagsAnd(tags, trail.tagsAnd, trail.tags) && !trail.collaborative
                    ).map(trail => trail._id)
                }
            });

            trailsIdArr = trailsInSections.flatMap((e) => e.trails);
            sectionsIdArr = idSections;

            delete req.query.channel;
        }

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
                query['_id'] = { $in: trailsIdArr };
            }

            let trails = await populateTrails(true, query);
            const allTrackingUser = await Tracking.find({
                userLogin: { $eq: user.networkLogin },
                $or: [
                    { expiredCompletion: { $exists: false } },
                    { expiredCompletion: { $eq: null } },
                ],
            });

            for (let trail of trails) {
                const processedTrail = processTrailTrackingV2(trail, allTrackingUser);

                if (trail.expirationType) {
                    trail = processExpirationDate(trail, user);
                }

                trail = processedTrail.trail;

                for (const tag of trail.tags) {
                    const groupsForTag = classGroupsMap.get(tag.value);
                    if (groupsForTag?.length) {
                        trail.classGroup = findObjectInRange(groupsForTag, now);
                        if (trail.classGroup) break; // Exit early once classGroup is found
                    }
                }
            }

            const filteredTrails = trails.filter(checkIfTheTrackIsValid);

            let arrSections = await elegiblesContents(filteredTrails);

            const sectionToShow = {
                mandatorySectionInfo: sectionInfos.find(section => section.defaultType === DEFAULT_TYPES.MANDATORY),
                recentSectionInfo: sectionInfos.find(section => section.defaultType === DEFAULT_TYPES.RECENTS),
                keepLearningSectionInfo: sectionInfos.find(section => section.defaultType === DEFAULT_TYPES.KEEP_LEARNING),
                concludedSectionInfo: sectionInfos.find(section => section.defaultType === DEFAULT_TYPES.CONCLUDED),
                coursesSectionInfo: sectionInfos.find(section => section.defaultType === DEFAULT_TYPES.COURSES),
                favoriteSectionInfo: sectionInfos.find(section => section.defaultType === DEFAULT_TYPES.FAVORITES),
                mostSeenSectionInfo: sectionInfos.find(section => section.defaultType === DEFAULT_TYPES.MOST_SEEN),
                recommendedTrailsSectionInfo: sectionInfos.find(section => section.defaultType === DEFAULT_TYPES.RECOMMENDED_TRAILS),
                recommendedCoursesSectionInfo: sectionInfos.find(section => section.defaultType === DEFAULT_TYPES.RECOMMENDED_COURSES),
            }

            const [
                arrMandatorySections,
                arrRecentsSections,
                arrKeepLearningSections,
                arrConcludedSections,
                arrFavoriteSections,
                arrMostSeenSections,
                arrCoursesSections,
                arrRecommendedCoursesSections,
                arrRecommendedTrailsSections
            ] = await Promise.all([
                sectionToShow.mandatorySectionInfo ? mandatorySections(filteredTrails, tags, sectionToShow.mandatorySectionInfo) : Promise.resolve([]),
                sectionToShow.recentSectionInfo ? recentsSections(filteredTrails, tags, sectionToShow.recentSectionInfo) : Promise.resolve([]),
                sectionToShow.keepLearningSectionInfo ? keepLearningSections(filteredTrails, tags, sectionToShow.keepLearningSectionInfo) : Promise.resolve([]),
                sectionToShow.concludedSectionInfo ? concludedSections(filteredTrails, tags, sectionToShow.concludedSectionInfo) : Promise.resolve([]),
                sectionToShow.favoriteSectionInfo ? favoriteSections(filteredTrails, user._id, sectionToShow.favoriteSectionInfo) : Promise.resolve([]),
                sectionToShow.mostSeenSectionInfo ? mostSeenSections(filteredTrails, tags, sectionToShow.mostSeenSectionInfo) : Promise.resolve([]),
                sectionToShow.coursesSectionInfo ? courseInSections(tags, user._id, sectionToShow.coursesSectionInfo) : Promise.resolve([]),
                sectionToShow.recommendedCoursesSectionInfo ? recommendedCoursesSections(user._id, sectionToShow.recommendedCoursesSectionInfo) : Promise.resolve([]),
                sectionToShow.recommendedTrailsSectionInfo ? recommendedTrailsSections(filteredTrails, user._id, sectionToShow.recommendedTrailsSectionInfo) : Promise.resolve([]),
            ]);

            function limitArray(section) {
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

            let resultSections = [
                arrSections,
                arrMandatorySections,
                arrRecentsSections,
                arrKeepLearningSections,
                arrConcludedSections,
                arrCoursesSections,
                arrFavoriteSections,
                arrMostSeenSections,
                arrRecommendedTrailsSections || [],
                arrRecommendedCoursesSections || [],
            ].flatMap(limitArray);

            if (channelId) {
                resultSections = resultSections.filter((obj) =>
                    obj ? sectionsIdArr.includes(obj._id) : false
                );
            }

            resultSections = resultSections.filter(Boolean);

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

            const hasSomeTrainingSection = resultSections.some(section => section.isTraining);

            if (hasSomeTrainingSection) {
                resultSections = await setAssessmentHistoricOnSections(user._id, resultSections, tags);
            }

            _messages.success(res, req, resultSections);
        }
    },

    async getCollaborationSectionDetail(req, res) {
        try {
            const sectionId = req.params.id;

            const user = await getUserByToken(req);

            const searchObj = {
                collaborative: true,
                $or: [{ moderation: 'approved' }, { moderation: 'denounced' }],
                enabled: true,
            };

            if (req?.segmentation) {
                handleSegmentationOnQuery(req, 'owner', searchObj)
            }

            const trails = await populateTrails(
                true,
                searchObj,
                { createdAt: -1 },
            );

            const filteredTrails = trails.filter(
                (trail) => trail.complaints.length <= 5
            );

            const allTrackingUser = await Tracking.find({
                userLogin: { $eq: user.networkLogin },
                $or: [
                    { expiredCompletion: { $exists: false } },
                    { expiredCompletion: { $eq: null } },
                ],
            });

            for (let trail of filteredTrails) {
                const processedTrail = processTrailTracking(
                    trail,
                    allTrackingUser
                );

                if (trail.expirationType) {
                    trail = processExpirationDate(trail, user);
                }

                trail = processedTrail.trail;
            }

            const arrSections = await elegiblesContents(filteredTrails);

            const arrKeepLearningSections = await keepLearningSections(
                filteredTrails
            );

            const arrConcludedSections = await concludedSections(
                filteredTrails
            );

            let resultSections = arrSections
                .concat(arrKeepLearningSections)
                .concat(arrConcludedSections)
                .filter((val) => {
                    return val != null;
                })
                .sort((a, b) => a.position < b.position ? -1 : 1);

            const responseSection = resultSections.find(
                (e) => String(e._id) === String(sectionId)
            );

            _messages.success(res, req, responseSection);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'trails',
                'getColaborativo'
            );
        }
    },

    async getSectionDetail(req, res) {
        const sectionId = req.params.id;
        const channelId = req.query?.channel ?? null;

        if (channelId) {
            const channel = await Channel.findOne({ _id: new ObjectId(channelId) });

            if (channel?.type === 'collaboration') {
                return module.exports.getCollaborationSectionDetail(req, res);
            }
        }

        const user = await getUserByToken(req);
        const tags = await getTagsElegiblesByToken(req);
        const classGroups = await getGroupCodesByToken(req, tags);

        const sectionQuery = {
            $and: [{
                _id: {
                    $eq: sectionId
                }
            }]
        }

        const section = await Section.findOne(sectionQuery).lean();

        if (!section) {
            _messages.notFound(res, req, 'Seção não encontrada');
            return;
        }

        const query = { enabled: true };

        const isDefaultSection = Object.values(DEFAULT_TYPES).includes(section.defaultType);

        if (isDefaultSection) {
            if (channelId) {
                const channel = await Channel.findOne({ _id: new ObjectId(channelId) });

                const sectionsIds = channel?.idSections ?? [];

                if (sectionsIds.length) {
                    const sections = await Section.find({
                        _id: { $in: sectionsIds },
                    }).select('trails -_id');

                    if (sections.length) {
                        const trailsInSections = sections
                            .flatMap((section) => section.trails.map(trail => getSectionTrailId(trail)))
                            .filter(Boolean)
                            .map(trailId => new ObjectId(trailId));

                        if (trailsInSections.length) query._id = { $in: trailsInSections };
                    }
                }
            }

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
            query._id = {
                $in: section.trails
                    .map(trail => getSectionTrailId(trail))
                    .filter(Boolean)
            };
        }

        const trailsDb = (await populateTrails(true, query))
            ?.filter(trail => checkEligibilityTagsAnd(tags, trail.tagsAnd, trail.tags) && !trail.collaborative)

        const allTrackingUser = await Tracking.find({
            userLogin: { $eq: user.networkLogin },
            $or: [
                { expiredCompletion: { $exists: false } },
                { expiredCompletion: { $eq: null } },
            ],
        });

        const processTrailInfo = (trail) => {
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
        };

        const trails = isDefaultSection
            ? trailsDb.map(processTrailInfo)
            : (section.trails?.map(sectionTrail => {
                if (isSectionTrailInfo(sectionTrail)) {
                    const trail = trailsDb.find(trail => String(trail._id) === String(getSectionTrailId(sectionTrail)));

                    if (!trail) return null;

                    return processTrailInfo(trail);
                }

                return sectionTrail;
            }) ?? [])
                .filter(trail => trail && isValidSectionTrailInfo(trail));

        let responseSection;

        function setResponse(fnResponse) {
            if (Array.isArray(fnResponse)) {
                return fnResponse.find((e) => String(e._id) === String(section._id))
                    ?? { ...section, trails: [] };
            }

            return { ...section, trails: fnResponse?.trails ?? [] };
        }

        let recommendedTrails = [];
        let recommendedCourses = [];

        if (req?.features?.matrices) {
            try {
                const { data } = await matricesApi.get(`/users/${user._id}`, {
                    headers: {
                        authorization: `Bearer ${req.headers.authorization}`,
                    },
                });
                recommendedTrails = data.data.recommendedTrails ?? [];
                recommendedCourses = data.data.recommendedCourses ?? [];
            } catch (error) {
                // console.log({ error })
            }
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
                const mostSeenSectionsResult = await mostSeenSections(trails);
                responseSection = setResponse(mostSeenSectionsResult);
                break;
            case DEFAULT_TYPES.RECOMMENDED_TRAILS:
                const recommendedTrailsSectionsResult = await recommendedTrailsSections(trails, recommendedTrails);
                responseSection = setResponse(recommendedTrailsSectionsResult);
                break;
            case DEFAULT_TYPES.RECOMMENDED_COURSES:
                const recommendedCoursesSectionsResult = await recommendedCoursesSections(user._id, recommendedCourses);
                responseSection = setResponse(recommendedCoursesSectionsResult);
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
            const [newSection] = await setAssessmentHistoricOnSections(user._id, [responseSection], tags);
            responseSection = newSection;
        }

        if (isDefaultSection && responseSection.trails?.length && section.trails?.length) {
            const originalOrder = section.trails.map(trail => trail._id);

            responseSection.trails = originalOrder.map(
                trailId => responseSection.trails.find(trail => String(trail._id) === String(trailId))
            ).filter(Boolean);
        }


        const filteredTrails = {
            ...responseSection,
            trails: Array.isArray(responseSection?.trails)
                ? responseSection.trails.filter(trail => {
                    if (!trail) return false; // Ignora entradas inválidas
                    return checkIfTheTrackIsValid(trail);
                })
                : []
        }

        res.json(filteredTrails);
    },

    async getSectionsFormation(req, res) {
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

    async getSectionsElegiblesNew(req, res) {
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

    async updatePosition(req, res) {
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

    async changeStatus(req, res) {
        const { id, status } = req.params;

        const section = await Section.findById(id);

        if (!section) {
            throw new ApiError('Seção não encontrada', 400);
        }

        section.active = status === 'active' ? 1 : 0;

        await section.save();

        _messages.success(res, req, 'Status alterado com sucesso');
    }
};
