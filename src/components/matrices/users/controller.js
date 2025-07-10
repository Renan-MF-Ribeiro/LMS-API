const { ObjectId } = require('mongoose').Types;
const { User } = require('../../users/model');
const { matricesApi } = require('../http-adapter');
const {
    buildEvaluationsResultSuggestions,
    buildSuggestions,
} = require('../business');
const { Group } = require('../../groups/model');
const courseBusiness = require('../../courses/business');
const ApiError = require('../../../errors/ApiError');
const { findUsersByMatrixConfig } = require('../../config/business');
const { getUserByToken } = require('../../../utils/functions');

const usersController = {
    findAll: async (req, res) => {
        try {
            const options = req.query;
            const { data } = await matricesApi.get('/users', { params: options });

            res.status(data.statusCode).json(data.data);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    findByRegistrationOrName: async (req, res) => {
        try {
            const { searchBy } = req.query;
            const applier = await getUserByToken(req);
            const users = await findUsersByMatrixConfig(applier, searchBy, 10)

            res.status(200).json(users);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    findOne: async (req, res) => {
        try {
            const { id } = req.params;
            const { data } = await matricesApi.get(`/users/${id}`);
            res.status(data.statusCode).json(data.data);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    findUsersMatrices: async (req, res) => {
        try {
            const { id } = req.params;
            const user = await User.findOne({ _id: id });

            if (!user) {
                return res.status(404).json({ message: 'Usuário não encontrado' });
            }

            const userGroups =
                (await Group.find({ name: { $in: user?.groupsAD } }, 'name tags')) || [];
            const tags =
                userGroups?.flatMap((group) => group?.tags?.map((tag) => tag?.value)).join(',') ||
                [];
            const { data } = await matricesApi.get(`/users/${id}/matrices`, {
                params: { tags, office: user?.office },
            });
            res.status(data.statusCode).json(data.data);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    findCategoriesToRelease: async (req, res) => {
        try {
            const { userId, matrixId } = req.params;
            const { data } = await matricesApi.get(`/users/${userId}/matrix/${matrixId}`);
            res.status(data.statusCode).json(data.data);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    findUsersEvaluationsResultSuggestions: async (req, res) => {
        try {
            const { id } = req.params;

            const user = await User.findOne({ _id: id });
            if (!user) {
                return res.status(404).json({ message: 'Usuário não encontrado' });
            }

            const { data } = await matricesApi.get(`/users/${id}/evaluations-result`);
            const populatedData = await buildEvaluationsResultSuggestions(
                data.data,
                user.networkLogin,
                user._id
            );

            res.status(data.statusCode).json(populatedData);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    findSuggestedContent: async (req, res) => {
        try {
            const { id } = req.params;
            const { data } = await matricesApi.get(`/users/${id}/suggestions`);

            const populatedData = await buildSuggestions(data.data);
            res.status(data.statusCode).json(populatedData);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    create: async (req, res) => {
        try {
            const { data } = await matricesApi.post('/users', req.body);
            res.status(data.statusCode).json(data.data);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    suggestContent: async (req, res) => {
        try {
            const { data } = await matricesApi.post('/users/suggest-content', req.body);

            if (req?.body?.recommendedCourses?.length > 0) {
                const user = await User.findOne({ _id: new ObjectId(req.body.userId) });

                if (!user) {
                    throw new ApiError('Usuário não encontrado', 404);
                }

                for (const recommendedCourse of req.body.recommendedCourses) {
                    await courseBusiness.listJoin(user, recommendedCourse.classId);
                }
            }

            res.status(data.statusCode).json(data.data);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    update: async (req, res) => {
        try {
            const id = req.params?.id;

            const { data } = await matricesApi.patch(`/users/${id}`, req.body);
            res.status(data.statusCode).json(data.data);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    delete: async (req, res) => {
        try {
            const id = req.params?.id;

            const { data } = await matricesApi.delete(`/users/${id}`, req.body);
            res.status(data.statusCode).json(data.data);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },
};

module.exports = usersController;
