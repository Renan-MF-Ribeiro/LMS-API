const { default: axios } = require('axios');
const { User } = require('../../users/model');
const { matricesApi } = require('../http-adapter');
const { getCoursesByUserID } = require('../../courses/business');
const {
    buildCoursesResponse,
    sortCoursesByConcludedAt,
    buildEvaluationsResultSuggestions,
    buildSuggestions,
} = require('../business');
const { getCompletedTrails } = require('../../tracking/business');
const { Group } = require('../../groups/model');
const courseBusiness = require('../../courses/business')

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
            const users = await User.find(
                {
                    $or: [
                        { registration: { $regex: searchBy, $options: 'i' } },
                        { name: { $regex: searchBy, $options: 'i' } },
                        { networkLogin: { $regex: searchBy, $options: 'i' } },
                    ],
                },
                'name _id registration networkLogin'
            ).limit(10);

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

    findUserCertifiers: async (req, res) => {
        try {
            const { id } = req.params;

            const user = await User.findOne({ _id: id });
            const uri = `${
                process.env.API_CERTIFIER
            }/certificates/find/${user.networkLogin?.toLowerCase()}?clientId=${
                process.env.CLIENT_ID
            }`;

            let token = req.headers.authorization;
            if (!token?.startsWith('Bearer')) {
                token = `Bearer ${token}`;
            }

            const { data } = await axios.get(uri, {
                headers: { Authorization: token },
            });
            res.status(200).json(data);
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
            const { data } = await matricesApi.get(`/users/${id}/evaluations-result`);
            const populatedData = await buildEvaluationsResultSuggestions(data.data);

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

    findUsersConcluedCourses: async (req, res) => {
        try {
            const { id } = req.params;
            const user = await User.findOne({ _id: id });

            if (!user) {
                return res.status(404).json({ message: 'Usuário não encontrado' });
            }

            const [courses, trails] = await Promise.all([
                getCoursesByUserID(id).then((courses) => buildCoursesResponse(courses)),

                getCompletedTrails(user.networkLogin),
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

            if (req?.body?.recommendedCourses?.length > 0) {
                for (const recommendedCourse of req.body.recommendedCourses) {
                    await courseBusiness.listJoin(req.body.userId, recommendedCourse.classId)
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
