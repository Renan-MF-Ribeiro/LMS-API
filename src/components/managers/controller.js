const business = require('./business');
const { findUsersByMatrixConfig } = require('../config/business');
const { matricesApi } = require('../matrices/http-adapter');
const { Group } = require('../groups/model');
const { User } = require('../users/model');
const { searchCourseBy } = require('../courses/business');
const { searchTrailBy } = require('../trails/business');
const { getTagsByUserIds } = require('../users/business');

const managersController = {
    pendingActions: async (req, res) => {
        try {
            const target = req.params?.target;

            let [users, isMatrixActive] = await Promise.all([
                business.findManagedUsers(req),
                business.isMatrixActive(),
            ]);
            
            if (isMatrixActive) {
                users = await business.handleUsersWhenMatrixIsActive(req.query, users, target);
            }
            const paginatedUsers = business.paginateUsers(req, users, target);
            res.status(200).json(paginatedUsers);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    getOverview: async (req, res) => {
        try {
            const users = await business.findManagedUsers(req);

            if (!users[0]) {
                return res.status(httpStatus.OK).json([]);
            }

            const userIds = users.map((u) => u._id);

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
            const appliableUsers = await business.findManagedUsers(req);

            if (appliableUsers.length === 0) {
                return res.status(httpStatus.OK).json([]);
            }

            const userIds = appliableUsers.map((u) => u._id.toString());

            const { id } = req.params;
            const { data } = await matricesApi.post(`/applications/overview/${id}`, {
                userIds,
            });

            const apiUsersMap = new Map(
                data.data?.users?.map((apiUser) => [apiUser.userId?.toString(), apiUser])
            );

            const response = {
                ...data.data,
                users: appliableUsers.map((user) => ({
                    _id: user?._id,
                    name: user?.name,
                    networkLogin: user?.networkLogin,
                    office: user?.office,
                    finalGrade: apiUsersMap.get(user?._id?.toString())?.finalGrade || null,
                    grades: apiUsersMap.get(user?._id?.toString())?.grades || [],
                })),
            };

            res.status(data.statusCode).json(response);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    searchContent: async (req, res) => {
        try {
            const type = req.params?.type;
            const { searchBy, userId, start, end, courseId } = req.query;

            let targetUsers = userId;
            if (!targetUsers) {
                targetUsers = await business
                    .findManagedUsers(req)
                    .then((users) => users?.map((u) => u?._id));
            }

            const [users, tags] = await getTagsByUserIds(targetUsers);

            if (type === 'trails') {
                const response = await searchTrailBy(searchBy, tags);
                return res.status(200).json(response);
            }

            if (type === 'courses') {
                const response = [];
                for await (const user of users) {
                    const courses = await searchCourseBy(user, tags, start, end, courseId);
                    response.push(...courses);
                }
                return res.status(200).json(response);
            }

            res.status(400).json('Insira um tipo de busca válido: "trails" ou "courses"');
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            console.log({ error: errorMessage });
            res.status(statusCode).json(errorMessage);
        }
    },

    getAvailableUsersByContent: async (req, res) => {
        try {
            const type = req.params?.type;

            if(type === 'trails'){
                const response = await business.getAvailableUsersByTrail(req);
                return res.status(200).json(response);
            }

            if(type === 'courses'){
                const response = await business.getAvailableUsersByCourse(req);
                return res.status(200).json(response);
            }

            const response = null;

            res.status(data.statusCode).json(response);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            console.log({ error: errorMessage });
            res.status(statusCode).json(errorMessage);
        }
    },
};

module.exports = managersController;
