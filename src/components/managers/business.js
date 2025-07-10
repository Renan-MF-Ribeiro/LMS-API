const { getUserByToken, pagination, ordernation, processTrailTracking } = require("../../utils/functions");
const configBusiness = require("../config/business");
const { getCoursesByIds } = require("../courses/business");
const { ClassModel } = require("../courses/model");
const { matricesApi } = require("../matrices/http-adapter");
const { Features } = require("../theme/features/model");
const { Tracking } = require("../tracking/model");
const { getTrailByIds } = require("../trails/business");
const { Trail } = require("../trails/model");
const { User } = require("../users/model");

const business = {
    findManagedUsers: async (req) => {
        const [user, rules] = await Promise.all([
            getUserByToken(req),
            configBusiness.getManagerRule()
        ]);

        const matchingRules = await module.exports.getMatchingRules(user, rules);
        if (!matchingRules?.[0]) {
            return [];
        }

        let query = matchingRules?.map((r) => ({ [r.managerField]: { $in: r.managerValues } }))

        if (req.query.searchBy) {
            const searchRegex = new RegExp(req.query.searchBy, 'i');
            query = query.map(q => ({
                ...q,
                $or: [
                    { name: searchRegex },
                    { networkLogin: searchRegex },
                    { office: searchRegex }
                ]
            }))
        }
        return await User.find({ $or: query }, '_id name networkLogin office').lean()
    },

    isUserManager: async (user, rules) => {
        if (!user || !rules) return false;

        for (const rule of rules) {
            if (rule.managerValues?.some(v => user[rule.managerField] === v)) {
                return true;
            }
        }

        return false;
    },

    getMatchingRules: async (user, rules) => {
        if (!user || !rules) return [];

        return rules?.filter(rule => {
            return rule?.managerValues?.some(value => user?.[rule?.managerField] === value);
        });
    },

    paginateUsers(req, users) {
        const { skip, limit } = pagination(req);

        const { orderBy = 'name', direction = 'asc' } = req?.query;
        const { sort, order } = ordernation({ query: { orderBy, direction } });

        const sortedUsers = [...users].sort((a, b) => {
            const fieldA = a[order] ?? a.user?.[order];
            const fieldB = b[order] ?? b.user?.[order];

            if (typeof fieldA === 'string' && typeof fieldB === 'string') {
                return sort === 'desc' ? fieldB.localeCompare(fieldA) : fieldA.localeCompare(fieldB);
            }

            return sort === 'desc' ? Number(fieldB) - Number(fieldA) : Number(fieldA) - Number(fieldB);
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
        const { data } = await matricesApi.get('/users/detailed-info', {
            params: {
                ...query,
                userIds: users?.map((user) => user._id).join(','),
            },
        });

        const responseUsers = data.data?.map((user) => {
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
        });

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

            return results
                ?.filter((r) => r.inProgress && !r.hasPendingActions)
                ?.map((r) => r.user);
        }

        return users;
    },

    buildSuggestions: async (data) => {
        const idToDateMap = new Map();

        data.recommendedTrails?.forEach((trail) => {
            idToDateMap.set(trail?.id?.toString(), trail?.createdAt);
        });

        data.recommendedCourses?.forEach((course) => {
            idToDateMap.set(course?.courseId?.toString(), course?.createdAt);
        });

        const ids = Array.from(idToDateMap.keys()).flat();

        const [trails, courses] = await Promise.all([getTrailByIds(ids), getCoursesByIds(ids)]);
        return [
            ...trails.map((trail) => ({
                ...trail,
                type: 'Online',
                createdAt: idToDateMap.get(trail._id?.toString()) || new Date(0),
            })),
            ...courses.map((course) => ({
                ...course,
                type: 'Presencial',
                createdAt: idToDateMap.get(course.id?.toString()) || new Date(0),
            })),
        ];
    },
}

module.exports = business;