const business = require("./business");
const { findUsersByMatrixConfig } = require("../config/business");
const { matricesApi } = require('../matrices/http-adapter');

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
            const appliableUsers = await business.findManagedUsers(req);

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

module.exports = managersController;
