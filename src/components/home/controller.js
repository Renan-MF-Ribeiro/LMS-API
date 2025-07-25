const axios = require('axios');
const _messages = require('../../utils/messages');
const { Item } = require('../items/model');
const { Tracking } = require('../tracking/model');
const { Trail } = require('../trails/model');
const {
    checkIfTheTrackIsValid,
    checkEligibilityTagsAnd,
    getTagsElegiblesByToken,
    filterTrails,
    filterAlura,
    mapAlura,
    courseInSections
} = require('../sections/business');
const { User } = require('../users/model');
const {
    getUserByToken,
    getTagsGroupsByToken,
    processTrailTracking,
    getDateTodayWithoutHours,
    handleStudentAverage,
    handleStudentTrails,
    handleStudentTrailsV2,
    pagination
} = require('../../utils/functions');
const { extractTextFromRichText } = require('../../utils/extract-text-from-richtext');
const {
    trailsCompletedOrInProgress,
    studentAverageCourses,
    calculateAverageStudent,
    getNumberOfItemsCompletedOrInProgressOrNotStarted,
    getStudentCourses,
    returnCertificates,
    averageGroupCourses,
    averageGroupRatings
} = require('./business');

const { populateTrails } = require('../trails/business');
const { Section } = require('../sections/model');
const { maxBy } = require('lodash');
const { getDbCurrentFeatures } = require('../../utils/features');

const HomeController = {
    async searchBy(req, res) {
        const { searchBy, pageIndex, pageSize, ...filters } = req.query;
        const filtersValues = Object.values(filters);
        const hasFilters = filtersValues.some((filter) => filter === 'true');
        if (!searchBy?.length && !hasFilters) {
            // console.log('No searchBy or filters provided');
            return _messages.success(res, req, {});
        }
        const user = await getUserByToken(req);
        const tags = await getTagsGroupsByToken(req);
        const classGroups = user?.classGroups ?? [];

        const { skip, limit } = pagination({
            query: {
                pageIndex: Number(pageIndex),
                pageSize: Number(pageSize)
            }
        });
        let filteredTrails = [];
        let result = [];

        for (const tag of user.tags) {
            delete tag.createdAt;
            tags.push(tag);
        }

        classGroups?.forEach(({ groupCode, startDate, limitDate }) => {
            if (groupCode && startDate && limitDate && startDate <= new Date() && limitDate >= new Date()) {
                tags?.push({ display: groupCode, value: groupCode });
            }
        });

        const escapedSearchBy = searchBy ? searchBy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
        const items = await Item.find({
            $or: [
                {
                    title: {
                        $regex: escapedSearchBy,
                        $options: 'i'
                    }
                },
                {
                    description: {
                        $regex: escapedSearchBy,
                        $options: 'i'
                    }
                }
            ],
            enabled: true,
            deleted: { $eq: 0 }
        });

        filteredTrails = await populateTrails(true, {
            $or: [
                {
                    $or: [
                        {
                            title: {
                                $regex: escapedSearchBy,
                                $options: 'i'
                            }
                        },
                        {
                            description: {
                                $regex: escapedSearchBy,
                                $options: 'i'
                            }
                        }
                    ],
                    tags: { $in: tags },
                    enabled: true
                },
                {
                    'items.itemID': { $in: items.map((item) => item._id) },
                    $or: [{ tags: { $in: tags } }, { mandatory: { $in: tags } }],
                    enabled: true
                }
            ]
        });

        filteredTrails = filteredTrails.filter((trail) => {
            return checkEligibilityTagsAnd(tags, trail.tagsAnd, trail.tags) && checkIfTheTrackIsValid(trail);
        });

        const itemsIds = filteredTrails.flatMap((t) => t.items.map((i) => i.itemID._id));
        const allTrackingUser = await Tracking.find({
            userLogin: { $eq: user.networkLogin },
            item: { $in: itemsIds },
            $or: [
                { expiredCompletion: { $exists: false } },
                { expiredCompletion: { $eq: null } }
            ]
        });

        for (let trail of filteredTrails) {
            const processedTrail = processTrailTracking(trail, allTrackingUser);
            trail = processedTrail.trail;
            result.push(trail);
        }

        if (hasFilters) {
            result = filterTrails(filters, result, tags);
        }

        const sections = await Section.find({
            trails: { $in: result.map((t) => t._id) },
            active: 1,
            deleted: 0
        }).lean();

        const trailMap = new Map();
        sections.forEach((section) => {
            section.trails.forEach((trailId) => {
                if (!trailMap.has(trailId.toString())) {
                    trailMap.set(trailId.toString(), section._id);
                }
            });
        });

        result = sections
            .map((section) => {
                return {
                    ...section,
                    trails: section.trails
                        .filter((trailId) => {
                            return (
                                result.some(({ _id }) => _id.equals(trailId)) &&
                                section._id.equals(trailMap.get(trailId.toString()))
                            );
                        })
                        .map((trailId) => {
                            return result.find(({ _id }) => _id.equals(trailId));
                        })
                };
            }).filter((section) => section.trails.length > 0);

        const trailsWithoutSection = filteredTrails.filter(
            (trail) => result.every(
                (section) => !section.trails.find(
                    (sectionTrail) => String(sectionTrail._id) === String(trail._id)
                )
            )
        );

        const filteredTrailsWithoutSection = hasFilters
            ? filterTrails(filters, trailsWithoutSection, tags)
            : trailsWithoutSection;

        if (filteredTrailsWithoutSection.length) {
            result.push({
                _id: 'trails-without-section',
                title: 'SEM SEÇÃO',
                trails: filteredTrailsWithoutSection
            });
        }

        // Recupera Cursos presenciais
        const course = await courseInSections(tags, user);

        if (course && course.trails && searchBy) {
            course.trails = course?.trails?.filter(trail => {
                // recupera o nome de todas as turmas do curso
                const classNames = (trail?.classes || []).map(c => c.name);

                // recupera titulo e descrição do curso
                const { title, description } = trail;

                // retorna TRUE caso algum dos itens corresponda a pesquisa
                return [title, description, ...classNames].some(stg => extractTextFromRichText(stg).toLowerCase().includes(searchBy.toLowerCase()));
            });

            result.push(course);
        }

        const features = await getDbCurrentFeatures(req);

        if (features?.alura) {
            try {
                const host = process.env.API_ALURA;
                const clientId = process.env.CLIENT_ID;
                const headers = { 'x-client-key': process.env.API_KEY_ALURA };
                const email = user.email;
                const aluraSearchBy = encodeURI(searchBy || ' ') ?? '';
                const uri = `${host}/courses/search/${clientId}?email=${email}&searchBy=${aluraSearchBy}`;
                const { data } = await axios.get(uri, { headers });

                result.push(...mapAlura(filterAlura(filters, data)));
            } catch (error) {
                console.error('Erro ao buscar cursos da Alura:', error.message);

                await Log.create({
                    dataNew: { error: error.response?.data ?? error },
                    groups: groupsAD ?? [],
                    user: user._id,
                    login: user.networkLogin,
                    type: "ERROR",
                    message: "Erro ao buscar cursos da Alura",
                    component: "home",
                    route: "searchBy",
                    ip: req.ip,
                    browserDetails: req.headers['user-agent'],
                });
            }
        }

        _messages.success(res, req, { data: result.slice(skip, skip + limit), total: result.length });
    },

    async searchTrailsItems(req, res) {
        try {
            const user = await getUserByToken(req);
            const tags = await getTagsGroupsByToken(req);
            const searchBy = req.query.searchBy;
            let filterTrails = [];
            const result = [];

            const allTrackingUser = await Tracking.find({
                userLogin: { $eq: user.networkLogin },
                $or: [
                    { expiredCompletion: { $exists: false } },
                    { expiredCompletion: { $eq: null } }
                ]
            });

            for (const tag of user.tags) {
                delete tag.createdAt;
                tags.push(tag);
            }

            filterTrails = await populateTrails(true, {
                $or: [
                    { title: new RegExp(searchBy, 'gi') },
                    { description: new RegExp(searchBy, 'gi') }
                ],
                tags: { $in: tags },
                enabled: true
            });

            filterTrails = filterTrails.filter((trail) =>
                checkEligibilityTagsAnd(tags, trail.tagsAnd, trail.tags)
            );
            filterTrails = filterTrails.filter((trail) => checkIfTheTrackIsValid(trail));

            const items = await Item.find({
                description: new RegExp(searchBy, 'gi'),
                enabled: true,
                deleted: { $eq: 0 }
            });

            for (const item of items) {
                const itemTrail = await populateTrails(true, {
                    'items.itemID': { $in: item._id },
                    $or: [{ tags: { $in: tags } }, { mandatory: { $in: tags } }],
                    enabled: true
                });

                if (itemTrail) {
                    for (const t of itemTrail) {
                        const isValidTrail = checkIfTheTrackIsValid(t);
                        if (isValidTrail) {
                            const index = filterTrails.findIndex((val) => val.id === itemTrail.id);
                            if (index === -1) {
                                filterTrails.push(t);
                            }
                        }
                    }
                }
            }

            for (let trail of filterTrails) {
                const processedTrail = processTrailTracking(trail, allTrackingUser);
                trail = processedTrail.trail;
                result.push(trail);
            }

            _messages.success(res, req, result);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'home',
                'searchTrailsItems'
            );
        }
    },

    async dashboardStudent(req, res) {
        try {
            const user = await getUserByToken(req);
            const courses = await getStudentCourses(req);

            const allTrails = await Trail.countDocuments();

            const resultTrails = await trailsCompletedOrInProgress(req);
            const certificates = await returnCertificates(resultTrails.trailsCompleted, user);
            const {
                numberOfItemsCompleted,
                numberOfItemsInProgress,
                numberOfItemsNotStarted,
                numberOfItemsMandatoryNotStarted,
                numberOfItemsMandatoryCompleted,
                numberOfItemsMandatoryInProgress
            } = await getNumberOfItemsCompletedOrInProgressOrNotStarted(req);
            const { averageStudentCourses, numberTrailsCompleted, numberTrailsElegibles } =
                await studentAverageCourses(user, req); // Não necessita de mudanças

            const groupA = process.env.groupA;
            const groupB = process.env.groupB;

            const averageGroupACourses = await averageGroupCourses(user, groupA);
            const averageGroupBCourses = await averageGroupCourses(user, groupB);

            const averageStudent = await calculateAverageStudent(user); // Não necessita de mudanças

            const averageGroupARatings = await averageGroupRatings(user, groupA);
            const averageGroupBRatings = await averageGroupRatings(user, groupB);

            const tags = await getTagsGroupsByToken(req);

            for (const tag of user.tags) {
                delete tag.createdAt;
                tags.push(tag);
            }

            const allTrailsElegibles = await Trail.find({
                tags: { $in: tags },
                enabled: true,
                startDate: { $lt: getDateTodayWithoutHours() },
                endDate: { $gt: getDateTodayWithoutHours() }
            }).countDocuments();

            await User.findByIdAndUpdate(user._id, {
                averageRating: averageStudent.toFixed(2),
                numberTrailsCompleted,
                numberTrailsElegibles
            });

            _messages.success(res, req, {
                resultTrails,
                numberOfItemsCompleted,
                numberOfItemsInProgress,
                numberOfItemsNotStarted,
                numberOfItemsMandatoryNotStarted,
                numberOfItemsMandatoryCompleted,
                numberOfItemsMandatoryInProgress,
                averageStudentCourses,
                averageGroupACourses,
                averageGroupBCourses,
                averageStudent,
                averageGroupARatings,
                averageGroupBRatings,
                courses,
                certificates,
                allTrails,
                allTrailsElegibles
            });
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'home',
                'dashboardStudent'
            );
        }
    },

    async dashboardStudentv2(req, res) {
        const user = await getUserByToken(req);
        const tags = await getTagsElegiblesByToken(req);
        const courses = await getStudentCourses(req);

        const eligibleTrails = await Trail.find({
            tags: { $in: tags },
            enabled: true,
            startDate: { $lt: getDateTodayWithoutHours() },
            endDate: { $gt: getDateTodayWithoutHours() }
        })
            .sort({ createdAt: -1 })
            .populate('items.itemID');

        const totalTrails = eligibleTrails.length;

        const { average, highestScoreTrail } = await handleStudentAverage(user);

        const { completedTrails, inProgressTrails: notFilteredInProgressTrails } = await handleStudentTrailsV2(
            user,
            eligibleTrails
        );

        const percentageCompletedTrails = Number(
            ((completedTrails.length / totalTrails) * 100).toFixed(2)
        );

        const highestScoreTitle = highestScoreTrail?.title;

        const highestScoreUrl = highestScoreTrail?.titleURL;

        const inProgressTrails = notFilteredInProgressTrails.filter(trail => trail.notStarted === true && trail.nextItem);

        const highestProgressTrail = maxBy(inProgressTrails, (trail) => trail.progress ?? 0) || null;

        _messages.success(res, req, {
            totalCompletedTrails: completedTrails.length,
            totalTrails,
            percentageCompletedTrails,
            inProgressTrails,
            average,
            lastTrail: highestProgressTrail,
            highestScoreTitle,
            highestScoreUrl,
            courses
        });
    },

    async searchStudentCourses(req, res) {
        try {
            await getStudentCourses(req);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'home',
                '/searchStudentCourses'
            );
        }
    },

    async listCertificates(req, res) {
        const { searchBy } = req.query;
        req.query = {
            ...req.query,
            pageSize: req.query.pageSize ?? 10,
            pageIndex: req.query.pageIndex ?? 0,
        };
        const { skip, limit } = pagination(req);
        const user = await getUserByToken(req);

        const elegibleTrails = await Trail.find({ certificate: 1 }).populate('items.itemID');

        const { completedTrails } = await handleStudentTrailsV2(user, elegibleTrails);

        let certificates = await returnCertificates(completedTrails, user);

        if (searchBy) {
            certificates = certificates.filter(({ title }) => {
                return title?.toLowerCase()?.includes(searchBy.toLowerCase());
            });
        }

        certificates = certificates.sort((prev, curr) => {
            const prevConcludedAt = prev.concludedAt.getTime();
            const currConcludedAt = curr.concludedAt.getTime();
            return currConcludedAt - prevConcludedAt;
        });

        certificates = certificates.slice(Number(skip), Number(skip) + Number(limit));

        _messages.success(res, req, certificates);
    },

    async listExpiredCertificates(req, res) {
        const { searchBy } = req.query;
        req.query = { ...req.query, pageSize: req.query.pageSize ?? 5 };
        const { skip, limit } = pagination(req);
        const user = await getUserByToken(req);
        
        const elegibleTrails = await Trail.find({ certificate: 1 }).populate('items.itemID');
        
        const { completedTrails } = await handleStudentTrailsV2(user, elegibleTrails, true);

        let certificates = await returnCertificates(completedTrails, user);

        if (searchBy) {
            certificates = certificates.filter(({ title }) => {
                return title?.toLowerCase()?.includes(searchBy.toLowerCase());
            });
        }
        
        certificates = certificates.sort((prev, curr) => {
            const prevConcludedAt = prev.concludedAt.getTime();
            const currConcludedAt = curr.concludedAt.getTime();
            return currConcludedAt - prevConcludedAt;
        });

        certificates = certificates.slice(skip, skip + limit);

        _messages.success(res, req, certificates);
    },

    async noCertificates(req, res) {
        const { searchBy } = req.query;
        req.query = { ...req.query, pageSize: req.query.pageSize ?? 5 };
        const { skip, limit } = pagination(req);
        const user = await getUserByToken(req);
        const tags = await getTagsElegiblesByToken(req);
        const elegibleTrails = await Trail.find({
            tags: { $in: tags },
            enabled: true,
            startDate: { $lt: getDateTodayWithoutHours() },
            endDate: { $gt: getDateTodayWithoutHours() },
            certificate: 0
        }).populate('items.itemID');
        let { completedTrails } = await handleStudentTrails(user, elegibleTrails);


        if (searchBy) {
            completedTrails = completedTrails.filter(({ title }) => {
                return title.toLowerCase().includes(searchBy.toLowerCase());
            });
        }
        completedTrails = completedTrails.slice(skip, skip + limit);

        _messages.success(res, req, completedTrails);
    }
};

module.exports = HomeController;
