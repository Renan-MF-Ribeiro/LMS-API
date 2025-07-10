const {
    getUserByToken,
    pagination,
    ordernation,
    processTrailTracking,
} = require('../../../utils/functions');
const { findUsersByMatrixConfig } = require('../../config/business');
const { matricesApi } = require('../http-adapter');
const { ClassModel } = require('../../courses/model.js');
const { Trail } = require('../../trails/model.js');
const { Tracking } = require('../../tracking/model.js');
const httpStatus = require('http-status-codes');
const { User } = require('../../users/model.js');
const { getLastLoginByUser } = require('../../users/business.js');
const { getLastConclusionByUser } = require('../../tracking/business.js');
const business = require('../business.js');

const managersController = {
    pendingActions: async (req, res) => {
        try {
            const target = req.params.target;

            const applier = await getUserByToken(req);
            let users = await findUsersByMatrixConfig(applier);

            if (users.length === 0) {
                return res.status(httpStatus.OK).json(users);
            }

            if (req?.query?.searchBy) {
                const search = req.query?.searchBy?.toString().toLowerCase();

                users = users?.filter(({ user }) => {
                    return (
                        user?.name?.toLowerCase().includes(search) ||
                        user?.networkLogin?.toLowerCase().includes(search)
                    );
                });
            }

            const { data } = await matricesApi.get('/users/detailed-info', {
                params: {
                    ...req.query,
                    userIds: users?.map((user) => user?._id).join(',') || null,
                },
            });


            const filteredUsers = [];
            const idsMap = new Map(
                users?.map((user) => [
                    user._id?.toString(),
                    {
                        _id: user._id,
                        networkLogin: user.networkLogin,
                        name: user.name,
                        office: user.office,
                        profilePhoto: user.profilePhoto,
                    },
                ])
            );

            if (target === 'me') {
                filteredUsers.push(...data.data?.filter((user) => user?.hasPendingActions));
            }

            if (target === 'users') {
                for (const detailedUser of data.data) {
                    const isInProgress = await isUserInProgressTraining({
                        ...detailedUser,
                        networkLogin: idsMap.get(detailedUser.userId).networkLogin,
                    });

                    if (isInProgress) {
                        filteredUsers.push(detailedUser);
                    }
                }
            }
            const finalUsers = filteredUsers.map((detailedUser) => {
                const foundUser = idsMap.get(detailedUser.userId);

                return {
                    user: {
                        userId: foundUser._id,
                        networkLogin: foundUser.networkLogin,
                        name: foundUser.name,
                        office: foundUser.office,
                        profilePhoto: foundUser.profilePhoto,
                    },
                    lastApplicationAt: detailedUser.lastApplicationAt,
                    hasLowScore: detailedUser.hasLowScore,
                    performance: detailedUser.performance,
                };
            });

            const { skip, limit } = pagination(req);

            const { orderBy = 'lastApplicationAt' } = req?.query;
            const { sort, order } = ordernation({ query: { orderBy } });

            const sortedUsers = finalUsers?.sort((a, b) => {
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

            const paginatedUsers = sortedUsers.slice(skip, skip + limit);
            const response = {
                data: paginatedUsers,
                total: sortedUsers.length,
            }

            res.status(data.statusCode).json(response);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    findUsers: async (req, res) => {
        try {
            const applier = await getUserByToken(req);
            const users = await findUsersByMatrixConfig(applier, req.query?.searchBy);
            if (users.length === 0) {
                return res.status(httpStatus.OK).json(users);
            }

            const { data } = await matricesApi.get('/users/detailed-info', {
                params: {
                    ...req.query,
                    userIds: users.map((user) => user._id).join(','),
                },
            });

            const detailedUsers = data.data.map((detailedUser) => {
                const foundUser = users.find((user) => user._id.toString() === detailedUser.userId);

                return {
                    user: {
                        userId: foundUser._id,
                        networkLogin: foundUser.networkLogin,
                        name: foundUser.name,
                        office: foundUser.office,
                        profilePhoto: foundUser.profilePhoto,
                    },
                    lastApplicationAt: detailedUser.lastApplicationAt,
                    hasLowScore: detailedUser.hasLowScore,
                    performance: detailedUser.performance,
                };
            });

            const paginatedUsers = paginateUsers(req, detailedUsers);
            res.status(data.statusCode).json(paginatedUsers);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    getUser: async (req, res) => {
        try {
            const userId = req.params?.id;

            const user = await User.findById(userId);
            if (!user) return res.status(httpStatus.NOT_FOUND).json('Usuário não encontrado');

            const [userLastLogin, lastApplicationAt, lastPresenceInCourseAt, lastConclusionAt] =
                await Promise.all([
                    getLastLoginByUser(userId),
                    matricesApi.get(`/users/detailed-info/${userId}`),
                    getUserLastPresenceInCourse(userId),
                    getLastConclusionByUser(user.networkLogin),
                ]);
            const payload = {
                lastAccessAt: userLastLogin?.lastLogin,
                lastApplicationAt: lastApplicationAt?.data?.data?.[0]?.lastApplicationAt,
                lastConclusionAt: lastConclusionAt?.completionAt,
                lastPresenceInCourseAt: lastPresenceInCourseAt,
            };

            res.status(httpStatus.OK).send(payload);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    getOverview: async (req, res) => {
        try {
            const applier = await getUserByToken(req);
            const users = await findUsersByMatrixConfig(applier);

            if (!users[0]) {
                return res.status(httpStatus.OK).json([]);
            }

            const userIds = users.map(u => u._id);

            const { data } = await matricesApi.post('/applications/overview', { userIds });

            res.status(data.statusCode).json(data.data);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    getOverviewById: async (req, res) => {
        try {
            const applier = await getUserByToken(req);
            const appliableUsers = await findUsersByMatrixConfig(applier);

            if (appliableUsers.length === 0) {
                return res.status(httpStatus.OK).json([]);
            }

            const userIds = appliableUsers.map(u => u._id.toString());

            const { id } = req.params;
            const { data } = await matricesApi.post(`/applications/overview/${id}`, {
                userIds
            });

            const apiUsersMap = new Map(
                data.data?.users?.map(apiUser => [
                    apiUser.userId?.toString(),
                    apiUser
                ])
            );

            const response = {
                ...data.data,
                users: appliableUsers.map(user => ({
                    _id: user?._id,
                    name: user?.name,
                    networkLogin: user?.networkLogin,
                    office: user?.office,
                    finalGrade: apiUsersMap.get(user?._id?.toString())?.finalGrade || null,
                    grades: apiUsersMap.get(user?._id?.toString())?.grades || []
                }))
            };

            res.status(data.statusCode).json(response);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

};


// utils
function paginateUsers(req, users) {
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
}

async function getUserLastPresenceInCourse(userId) {
    return await business.getUserLastPresenceInCourse(userId);
}

module.exports = managersController;