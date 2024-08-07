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
    mapAlura
} = require('../sections/business');
const { User } = require('../users/model');
const {
    getUserByToken,
    getTagsGroupsByToken,
    processTrailTracking,
    getDateTodayWithoutHours,
    handleStudentAverage,
    handleStudentTrails,
    pagination,
} = require('../../utils/functions');
const {
    trailsCompletedOrInProgress,
    studentAverageCourses,
    calculateAverageStudent,
    getNumberOfItemsCompletedOrInProgressOrNotStarted,
    getStudentCourses,
    returnCertificates,
    averageGroupCourses,
    averageGroupRatings,
} = require('./business');

const { populateTrails } = require('../trails/business');
const { Section } = require('../sections/model');
const config = require('../../../config.json');

const HomeController = {
    async searchBy(req, res) {
        const { searchBy, pageIndex, pageSize, ...filters } = req.query;
        const filtersValues = Object.values(filters)
        const hasFilters = filtersValues.some((filter) => filter === 'true')

        if(!searchBy?.length && !hasFilters) {
            return _messages.success(res, req, {});
        }

        try {
            const user = await getUserByToken(req);
            const tags = await getTagsGroupsByToken(req);
            const { skip, limit } = pagination({ 
                query: { 
                    pageIndex: Number(pageIndex), 
                    pageSize: Number(pageSize)
                } 
            })
            let filteredTrails = [];
            let result = [];

            for (const tag of user.tags) {
                delete tag.createdAt;
                tags.push(tag);
            }

            const items = await Item.find({
                $or: [
                    { title: new RegExp(searchBy, 'gi') },
                    { description: new RegExp(searchBy, 'gi') },
                ],
                enabled: true,
                deleted: { $eq: 0 },
            });

            filteredTrails = await populateTrails(true, {
                $or: [
                    {
                        $or: [
                            { title: new RegExp(searchBy, 'gi') },
                            { description: new RegExp(searchBy, 'gi') },
                        ],
                        tags: { $in: tags },
                        enabled: true,
                    },
                    {
                        'items.itemID': { $in: items.map((item) => item._id) },
                        $or: [{ tags: { $in: tags } }, { mandatory: { $in: tags } }],
                        enabled: true,
                    },
                ],
            });

            filteredTrails = filteredTrails.filter((trail) =>{
                return checkEligibilityTagsAnd(tags, trail.tagsAnd, trail.tags) && checkIfTheTrackIsValid(trail)
            });

            const itemsIds = filteredTrails.flatMap((t) => t.items.map((i) => i.itemID._id));
            const allTrackingUser = await Tracking.find({
                userLogin: { $eq: user.networkLogin },
                item: { $in: itemsIds },
                $or: [
                    { expiredCompletion: { $exists: false } },
                    { expiredCompletion: { $eq: null } },
                ],
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
                deleted: 0,
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
                                }),
                    };
                }).filter((section) => section.trails.length > 0);

            if (config.alura.active) {
                const host = process.env.API_ALURA;
                const clientId = process.env.CLIENT_ID;
                const headers = { 'x-client-key': process.env.API_KEY_ALURA };
                const email = user.email;
                const aluraSearchBy = encodeURI(searchBy || ' ') ?? ''
                const uri = `${host}/courses/search/${clientId}?email=${email}&searchBy=${aluraSearchBy}`;
                const { data } = await axios.get(uri, { headers });

                result.push(...mapAlura(filterAlura(filters, data)));
            }

            _messages.success(res, req, { data: result.slice(skip, skip + limit), total: result.length });
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

    async searchTrailsItems (req, res) {
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
                    { expiredCompletion: { $eq: null } },
                ],
            });

            for (const tag of user.tags) {
                delete tag.createdAt;
                tags.push(tag);
            }

            filterTrails = await populateTrails(true, {
                $or: [
                    { title: new RegExp(searchBy, 'gi') },
                    { description: new RegExp(searchBy, 'gi') },
                ],
                tags: { $in: tags },
                enabled: true,
            });

            filterTrails = filterTrails.filter((trail) =>
                checkEligibilityTagsAnd(tags, trail.tagsAnd, trail.tags)
            );
            filterTrails = filterTrails.filter((trail) => checkIfTheTrackIsValid(trail));

            const items = await Item.find({
                description: new RegExp(searchBy, 'gi'),
                enabled: true,
                deleted: { $eq: 0 },
            });

            for (const item of items) {
                const itemTrail = await populateTrails(true, {
                    'items.itemID': { $in: item._id },
                    $or: [{ tags: { $in: tags } }, { mandatory: { $in: tags } }],
                    enabled: true,
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

    async dashboardStudent (req, res) {
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
                numberOfItemsMandatoryInProgress,
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
                endDate: { $gt: getDateTodayWithoutHours() },
            }).countDocuments();

            await User.findByIdAndUpdate(user._id, {
                averageRating: averageStudent.toFixed(2),
                numberTrailsCompleted,
                numberTrailsElegibles,
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
                allTrailsElegibles,
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

    async dashboardStudentv2 (req, res) {
        try {
            const user = await getUserByToken(req);
            const tags = await getTagsElegiblesByToken(req);
            const courses = await getStudentCourses(req);
            const elegibleTrails = await Trail.find({
                tags: { $in: tags },
                enabled: true,
                startDate: { $lt: getDateTodayWithoutHours() },
                endDate: { $gt: getDateTodayWithoutHours() },
            });
            const totalTrails = elegibleTrails.length;
            const { average, highestScoreTrail } = await handleStudentAverage(user);
            const { completedTrails, inProgressTrails } = await handleStudentTrails(
                user,
                elegibleTrails
            );
            const percentageCompletedTrails = Number(
                ((completedTrails.length / totalTrails) * 100).toFixed(2)
            );

            const highestScoreTitle = highestScoreTrail?.title;
            const highestScoreUrl = highestScoreTrail?.titleURL;

            _messages.success(res, req, {
                totalCompletedTrails: completedTrails.length,
                totalTrails,
                percentageCompletedTrails,
                inProgressTrails,
                average,
                highestScoreTitle,
                highestScoreUrl,
                courses
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

    async searchStudentCourses (req, res) {
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

    async listCertificates (req, res) {
        try {
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
            }).populate('items.itemID');
            const { completedTrails } = await handleStudentTrails(user, elegibleTrails);
            let certificates = await returnCertificates(completedTrails, user);

            if (searchBy) {
                certificates = certificates.filter(({ title }) => {
                    return title.toLowerCase().includes(searchBy.toLowerCase());
                });
            }
            certificates = certificates.sort((prev, curr) => {
                const prevConcludedAt = prev.concludedAt.getTime();
                const currConcludedAt = curr.concludedAt.getTime();
                return currConcludedAt - prevConcludedAt;
            });

            certificates = certificates.slice(skip, skip + limit);

            _messages.success(res, req, certificates);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'home',
                '/certificates'
            );
        }
    },

    async listExpiredCertificates (req, res) {
        try {
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
            }).populate('items.itemID');
            const { completedTrails } = await handleStudentTrails(user, elegibleTrails);
            let certificates = await returnCertificates(completedTrails, user);

            if (searchBy) {
                certificates = certificates.filter(({ title }) => {
                    return title.toLowerCase().includes(searchBy.toLowerCase());
                });
            }
            certificates = certificates.sort((prev, curr) => {
                const prevConcludedAt = prev.concludedAt.getTime();
                const currConcludedAt = curr.concludedAt.getTime();
                return currConcludedAt - prevConcludedAt;
            });

            certificates = certificates.slice(skip, skip + limit);

            _messages.success(res, req, certificates);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'home',
                '/certificates/expired'
            );
        }
    },

    async noCertificates (req, res) {
        try {
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
                certificate: 0,
            }).populate('items.itemID');
            let { completedTrails } = await handleStudentTrails(user, elegibleTrails);


            if (searchBy) {
                completedTrails = completedTrails.filter(({ title }) => {
                    return title.toLowerCase().includes(searchBy.toLowerCase());
                });
            }
            completedTrails = completedTrails.slice(skip, skip + limit);

            _messages.success(res, req, completedTrails);
        } catch (error) {
            console.log({ error });
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'home',
                '/certificates/expired'
            );
        }
    },
};

module.exports = HomeController;
