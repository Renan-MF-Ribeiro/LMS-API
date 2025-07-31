const { Types } = require('mongoose');
const {
    getUserByToken,
    pagination,
    ordernation,
    processTrailTracking,
} = require('../../utils/functions');
const configBusiness = require('../config/business');
const { getCoursesByIds, getCoursesByUserID } = require('../courses/business');
const { ClassModel } = require('../courses/model');
const { matricesApi } = require('../matrices/http-adapter');
const { Features } = require('../theme/features/model');
const { Tracking } = require('../tracking/model');
const { getTrailByIds } = require('../trails/business');
const { Trail } = require('../trails/model');
const { User } = require('../users/model');
const RecommendedContent = require('./schema/model');

const business = {
    findManagedUsers: async (req) => {
        const [user, rules] = await Promise.all([
            getUserByToken(req),
            configBusiness.getManagerRule(),
        ]);

        const matchingRules = await module.exports.getMatchingRules(user, rules);

        if (!matchingRules?.[0] && rules?.rules?.length > 0) {
            return [];
        }

        let query = matchingRules?.map((rule) => {
            const usersField = rule?.usersField;
            const managerField = rule?.managerField;

            if (!user[usersField]) {
                return;
            }

            return {
                [usersField]: user[usersField],
                [managerField]: { $nin: rule?.managerValues },
                enabled: true,
            };
        });

        if (rules?.useIsManagerFlag) {
            query.push({
                managerRegistration: user?.registration,
                enabled: true,
            });
        }

        if (req.query?.searchBy) {
            const searchRegex = new RegExp(req.query.searchBy, 'i');
            query = query.map((q) => ({
                ...q,
                $or: [
                    { name: searchRegex },
                    { networkLogin: searchRegex },
                    { office: searchRegex },
                ],
            }));
        }

        query = query.filter(Boolean);
        if (!query?.length) {
            return [];
        }

        const finalQuery = rules?.useIsManagerFlag ? { $or: query } : { $and: query };
        return await User.find(finalQuery, `_id name networkLogin office`).lean();
    },

    isUserManager: async (user) => {
        if (!user) return false;

        const rules = await configBusiness.getManagerRule();
        if (user?.manager?.toLowerCase() !== 'nao' && rules.useIsManagerFlag) return true;

        for (const rule of rules?.rules || []) {
            if (rule?.managerValues?.some((v) => user?.[rule?.managerField] === v)) {
                return true;
            }
        }

        return false;
    },

    getMatchingRules: async (user, rules) => {
        if (!user || !rules) return [];
        return rules?.rules?.filter((rule) => {
            return rule?.managerValues?.some(
                (value) => user?.[rule?.managerField]?.toLowerCase() === value?.toLowerCase()
            );
        });
    },

    paginateUsers(req, users) {
        const { skip, limit } = pagination(req);
        if (!users?.[0]?.user) {
            // Tratando objeto para que seja compativel com objeto gerado na matriz ativa
            users = users.map((user) => ({ user: { ...user, userId: user._id, _id: undefined } }));
        }
        const { orderBy = 'name', direction = 'asc' } = req?.query;
        const { sort, order } = ordernation({ query: { orderBy, direction } });

        const sortedUsers = [...users].sort((a, b) => {
            const fieldA = a[order] ?? a.user?.[order];
            const fieldB = b[order] ?? b.user?.[order];

            if (typeof fieldA === 'string' && typeof fieldB === 'string') {
                return sort === 'desc'
                    ? fieldB.localeCompare(fieldA)
                    : fieldA.localeCompare(fieldB);
            }

            return sort === 'desc'
                ? Number(fieldB) - Number(fieldA)
                : Number(fieldA) - Number(fieldB);
        });
        return { data: sortedUsers.slice(skip, skip + limit), total: sortedUsers.length };
    },

    buildCoursesResponse: async (courses) => {
        const response = courses?.map((course) => {
            return {
                _id: course.courseID?.id,
                title: course.courseID?.title,
                description: course.courseID?.description,
                concludedAt: course.users?.[0]?.presenceAt,
                location: course.location,
                type: 'Presencial',
            };
        });

        return response;
    },

    sortCoursesByConcludedAt: async (courses) => {
        return courses?.sort((a, b) => {
            const dateA = new Date(a.concludedAt).getTime();
            const dateB = new Date(b.concludedAt).getTime();
            return dateB - dateA; // Ordena do mais recente para o mais antigo
        });
    },

    isUserInProgressTraining: async (user) => {
        const [isInProgressCourses, isInProgressTrails] = await Promise.all([
            module.exports.checkCoursesProgress(user),
            module.exports.checkTrailsProgress(user),
        ]);
        return isInProgressCourses || isInProgressTrails;
    },

    checkCoursesProgress: async (user) => {
        const courseIds = user?.recommendedCourses?.map((course) => course.courseId);
        if (courseIds?.length === 0) return false;

        return !!(await ClassModel.exists({
            courseID: { $in: courseIds },
            'users.userID': user.userId,
        }));
    },

    checkTrailsProgress: async (user) => {
        const trailIds = user?.recommendedTrails?.map((trail) => trail?.id).filter(Boolean);
        if (trailIds?.length === 0) return false;

        const trails = await Trail.find({ _id: { $in: trailIds } });
        const allItemIds = trails.flatMap((trail) => trail.items?.map((item) => item.itemID) || []);
        if (allItemIds?.length === 0) return false;

        const trackings = await Tracking.find({
            userLogin: user.networkLogin,
            item: { $in: allItemIds },
        });

        return trails?.some((trail) => {
            const trailItems = trail.items?.map((item) => item.itemID) || [];
            const trailTracking = trackings?.filter((t) => trailItems.includes(t.item));
            const { trail: processedTrail } = processTrailTracking(trail, trailTracking);
            return processedTrail?.completion < 1;
        });
    },

    isMatrixActive: async () => {
        const features = await Features.find();
        return features.some((feature) => feature.matrices === true);
    },

    handleUsersWhenMatrixIsActive: async (query, users, target = null) => {
        if (!users?.length || !users[0]) {
            return [];
        }

        const { data } = await matricesApi.get('/users/detailed-info', {
            params: {
                ...query,
                userIds: users?.map((user) => user._id).join(','),
            },
        });

        const responseUsers =
            data?.data?.map((user) => {
                const foundUser = users?.find((u) => u?._id?.toString() === user?.userId);
                return {
                    user: {
                        userId: foundUser?._id,
                        networkLogin: foundUser?.networkLogin,
                        name: foundUser?.name,
                        office: foundUser?.office,
                        profilePhoto: foundUser?.profilePhoto,
                    },
                    lastApplicationAt: user?.lastApplicationAt,
                    hasLowScore: user?.hasLowScore,
                    performance: user?.performance,
                    hasPendingActions: user?.hasPendingActions,
                };
            }) || [];
        return await business.handleReqTarget(responseUsers, target);
    },

    handleReqTarget: async (users, target = null) => {
        if (target === 'me') {
            return users?.filter((user) => user?.hasPendingActions);
        }

        if (target === 'users') {
            const results = await Promise.all(
                users?.map(async (u) => ({
                    user: u,
                    inProgress: await business.isUserInProgressTraining(u),
                    hasPendingActions: u?.hasPendingActions,
                }))
            );

            return results?.filter((r) => r.inProgress && !r.hasPendingActions)?.map((r) => r.user);
        }

        return users;
    },

    buildSuggestions: async (data) => {
        if (!data) return [];

        const idToDateMap = new Map();
        data?.recommendedTrails?.forEach((trail) => {
            idToDateMap.set(trail?.id?.toString(), trail?.createdAt);
        });

        data?.recommendedCourses?.forEach((course) => {
            idToDateMap.set(course?.courseId?.toString(), course?.createdAt);
        });

        const ids = Array.from(idToDateMap.keys()).flat();

        const [trails, courses] = await Promise.all([getTrailByIds(ids), getCoursesByIds(ids)]);
        return [
            ...trails?.map((trail) => ({
                ...trail,
                type: 'Online',
                createdAt: idToDateMap.get(trail?._id?.toString()) || new Date(0),
            })),
            ...courses?.map((course) => ({
                ...course,
                type: 'Presencial',
                createdAt: idToDateMap.get(course?.id?.toString()) || new Date(0),
            })),
        ];
    },

    getAvailableUsersByTrail: async (req) => {
        const trailId = req.query?.id || req.query?.trailId;

        const [users, trail] = await Promise.all([
            module.exports.findManagedUsers(req),
            Trail.findOne({ _id: new Types.ObjectId(trailId) }).lean(),
        ]);

        if (!trail || !users[0]) {
            return [];
        }

        const allItemIds = trail?.items?.map((item) => item.itemID) || [];

        const [trackings, userRecommendations] = await Promise.all([
            Tracking.find({
                userLogin: { $in: users.map((u) => u.networkLogin) },
                item: { $in: allItemIds },
            }),
            RecommendedContent.find({
                userId: { $in: users.map((u) => u._id) },
            }),
        ]);

        const usersData = users.map((user) => {
            // Se volumetria for grande (+100 usuários em uma turma), começar a pensar em modificar esta lógica:
            const userStartedTrail = trackings?.some((t) => t?.userLogin === user?.networkLogin);
            const trailWasRecommended = userRecommendations?.some((rec) => {
                return rec?.recommendedTrails?.some(
                    (recTrail) => recTrail?.id?.toString() === trailId
                );
            });

            return {
                userId: user?._id,
                name: user?.name,
                networkLogin: user?.networkLogin,
                office: user?.office,
                status: trailWasRecommended || userStartedTrail ? 'started' : undefined,
            };
        });
        return usersData;
    },

    getAvailableUsersByCourse: async (req) => {
        const classId = req.query?.id || req.query?.classId;
        const [users, classFound] = await Promise.all([
            module.exports.findManagedUsers(req),
            ClassModel.findOne({ _id: new Types.ObjectId(classId) })
                .populate('courseID')
                .lean(),
        ]);
        if (!classFound || !users[0]) {
            return [];
        }

        // Lógica para verificar se o usuário já concluiu o curso anteriormente:

        /* const alreadyConcluded = new Set();
        for (const user of users) {
            const concluded = await getCoursesByUserID(user._id)
            if (concluded?.some((c) => c.id.toString() === classId)) {
                alreadyConcluded.add(user._id.toString());
            }
        } */

        const userData = users?.map((user) => {
            // Se volumetria for grande (+100 usuários em uma turma), começar a pensar em modificar esta lógica:
            const userInClass = classFound?.users?.some(
                (u) => u.userID.toString() === user._id.toString()
            );

            return {
                userId: user?._id,
                name: user?.name,
                networkLogin: user?.networkLogin,
                office: user?.office,
                status: userInClass ? 'registered' : undefined,
                //alreadyConcluded: alreadyConcluded.has(user._id?.toString())
            };
        });
        return userData;
    },
};

module.exports = business;
