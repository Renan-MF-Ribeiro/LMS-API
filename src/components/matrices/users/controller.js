const { default: axios } = require('axios');
const { User } = require('../../users/model');
const { matricesApi } = require('../http-adapter');
const { getCoursesByUserID } = require('../../courses/business');
const { buildCoursesResponse, sortCoursesByConcludedAt } = require('../business');
const { getCompletedTrails } = require('../../tracking/business');


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
            const users = await User.find({
                $or: [
                    { registration: { $regex: searchBy, $options: 'i' } },
                    { name: { $regex: searchBy, $options: 'i' } },
                    { networkLogin: { $regex: searchBy, $options: 'i' } },
                ],
            }, 'name _id registration networkLogin').limit(10);

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
            const { data } = await matricesApi.get(`/users/${id}/matrices`);
            res.status(data.statusCode).json(data.data);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    findUserCertifiers: async (req, res) => {
        try {
            const { id } = req.params;

            const user = await User.findOne({ _id: id });
            const uri = `${process.env.API_CERTIFIER
                }/certificates/find/${user.networkLogin?.toLowerCase()}?clientId=${process.env.CLIENT_ID
                }`;

            const { data } = await axios.get(uri, {
                headers: { Authorization: req.headers.authorization },
            });
            res.status(data.statusCode).json(data);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    findUsersRecommendedContent: async (req, res) => {
        try {
            const { id } = req.params;
            const { data } = await matricesApi.get(`/users/${id}/recommended-content`);
            res.status(data.statusCode).json(data.data);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    findUsersConcluedCourses: async (req, res) => {
        try {
            const { id } = req.params;
            const user = await User.findOne({ _id: id });

            if (!user) {
                return res.status(404).json({ message: 'Usuário não encontrado' });
            }


            const [courses, trails] = await Promise.all([
                getCoursesByUserID(id).then((courses) =>
                    buildCoursesResponse(courses)),

                getCompletedTrails(user.networkLogin)
            ]);
            const sortedCourses = await sortCoursesByConcludedAt([courses, trails].flat());
            res.status(200).json(sortedCourses);
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
