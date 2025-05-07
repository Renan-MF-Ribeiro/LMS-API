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
const { Group } = require('../../groups/model.js');

const managersController = {
    pendingActions: async (req, res) => {
        try {
            const target = req.params.target;

            const applier = await getUserByToken(req);
            const users = await findUsersByMatrixConfig(applier);

            if (users.length === 0) {
                return res.status(httpStatus.OK).json(users);
            }

            const { data } = await matricesApi.get('/users/detailed-info', {
                params: {
                    ...req.query,
                    userIds: users.map((user) => user._id).join(','),
                },
            });

            const filteredUsers = [];

            if (target === 'me') {
                filteredUsers.push(
                    ...data.data.filter(({ hasPendingActions }) => hasPendingActions)
                );
            } else if (target === 'users') {
                for (const detailedUser of data.data) {
                    const foundUser = users.find(
                        (user) => user._id.toString() === detailedUser.userId
                    );
                    const isInProgress = await isUserInProgressTraining({
                        ...detailedUser,
                        networkLogin: foundUser.networkLogin,
                    });

                    if (isInProgress) {
                        filteredUsers.push(detailedUser);
                    }
                }
            }

            const detailedUsers = filteredUsers.map((detailedUser) => {
                const foundUser = users.find((user) => user._id.toString() === detailedUser.userId);

                return {
                    user: {
                        userId: foundUser._id,
                        networkLogin: foundUser.networkLogin,
                        name: foundUser.name,
                        office: foundUser.office,
                        profilePhoto: foundUser.profilePhoto,
                    },
                    lastRegister: detailedUser.lastRegister,
                    hasLowScore: detailedUser.hasLowScore,
                    performance: detailedUser.performance,
                };
            });

            let finalUsers = detailedUsers;

            if (req?.query?.searchBy) {
                const search = req.query?.searchBy?.toString().toLowerCase();

                finalUsers = detailedUsers.filter(({ user }) => {
                    return (
                        user.name.toLowerCase().includes(search) ||
                        user.networkLogin.toLowerCase().includes(search)
                    );
                });
            }

            const { skip, limit } = pagination(req);

            const { orderBy = 'lastRegister' } = req?.query;
            const { sort, order } = ordernation({ query: { orderBy } });

            const sortedUsers = [...finalUsers].sort((a, b) => {
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

            res.status(data.statusCode).json(paginatedUsers);
        } catch (error) {
            console.log(error)
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    findUsers: async (req, res) => {
        try {
            const applier = await getUserByToken(req);
            const users = await findUsersByMatrixConfig(applier);

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
                    lastRegister: detailedUser.lastRegister,
                    hasLowScore: detailedUser.hasLowScore,
                    performance: detailedUser.performance,
                };
            });

            const { skip, limit } = pagination(req);

            const { orderBy = 'name', direction = 'asc' } = req?.query;
            const { sort, order } = ordernation({ query: { orderBy, direction } });

            const sortedUsers = [...detailedUsers].sort((a, b) => {
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

            res.status(data.statusCode).json(paginatedUsers);
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

            if (users.length === 0) {
                return res.status(httpStatus.OK).json(users);
            }

            const usersTags = users.flatMap((user) => user.groupsAD);
            const usersGroups = (await Group.find({ name: { $in: usersTags } }, 'name tags')) || [];
            const tags =
                usersGroups?.flatMap((group) => group?.tags?.map((tag) => tag?.value)) || [];

            const { data } = await matricesApi.get('/applications/overview', {
                params: {
                    tags: tags.join(','),
                },
            });

            res.status(data.statusCode).json(data.data);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    recommendContent: async (req, res) => {
        try {
            const { userId, target } = req.params;
            
            switch (target) {
                case 'trails': {

                }
            }

            res.status(httpStatus.OK).send()
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },
};

async function isUserInProgressTraining(user) {
    let isInProgress = false;

    for (const recommendedCourse of user.recommendedCourses) {
        if (isInProgress) {
            break;
        }

        const foundClass = await ClassModel.findOne({
            courseID: recommendedCourse.courseId,
            'users.userID': user.userId,
        });

        if (foundClass?._id) {
            isInProgress = true;
        }
    }

    for (const recommendedTrail of user.recommendedTrails) {
        if (isInProgress) {
            break;
        }
        const foundTrail = await Trail.findOne({ _id: recommendedTrail });
        const foundTrackings = await Tracking.find({
            userLogin: user.networkLogin,
            item: { $in: foundTrail?.items?.map((item) => item.itemID) },
        });
        const { trail } = processTrailTracking(foundTrail, foundTrackings);

        if (trail?.completion && trail.completion < 1) {
            isInProgress = true;
        }
    }

    return isInProgress;
}

module.exports = managersController;
