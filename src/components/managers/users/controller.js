const httpStatus = require('http-status-codes');
const { getCoursesByUserID } = require('../../courses/business');
const { getUserLastPresenceInCourse } = require('../../matrices/business');
const { getLastConclusionByUser, getCompletedTrails } = require('../../tracking/business');
const { getLastLoginByUser } = require('../../users/business');
const { User } = require('../../users/model');
const business = require('../business');
const { default: axios } = require('axios');
const { matricesApi } = require('../../matrices/http-adapter');
const RecommendedContent = require('../schema/model');
const { Trail } = require('../../trails/model');
const { ClassModel, CourseModel } = require('../../courses/model');

const managersUsersController = {
    findUserById: async (req, res) => {
        const userId = req.params?.id;

        const user = await User.findById(userId);
        if (!user) return res.status(httpStatus.NOT_FOUND).json('User not found');

        const [userLastLogin, lastPresenceInCourseAt, lastConclusionAt, isMatrixActive] =
            await Promise.all([
                getLastLoginByUser(userId),
                getUserLastPresenceInCourse(userId),
                getLastConclusionByUser(user.networkLogin),
                business.isMatrixActive()
            ]);

        const payload = {
            lastAccessAt: userLastLogin?.lastLogin || null,
            lastConclusionAt: lastConclusionAt?.completionAt || null,
            lastPresenceInCourseAt: lastPresenceInCourseAt || null,
        };

        if (isMatrixActive) {
            const lastApplicationAt = await matricesApi.get(`/users/detailed-info/${userId}`);
            payload.lastApplicationAt = lastApplicationAt?.data?.data?.[0]?.lastApplicationAt || null;
        }

        res.status(httpStatus.OK).send(payload);

    },

    findManagedUsers: async (req, res) => {
        let [users, isMatrixActive] = await Promise.all([
            business.findManagedUsers(req),
            business.isMatrixActive(),
        ]);

        if (isMatrixActive) {
            users = await business.handleUsersWhenMatrixIsActive(req.query, users);
        }
        const paginatedUsers = business.paginateUsers(req, users);
        res.status(200).json(paginatedUsers);
    },

    findUsersConcludedCourses: async (req, res) => {
        try {
            const { id } = req.params;
            const user = await User.findOne({ _id: id });

            if (!user) {
                return res.status(404).json({ message: 'Usuário não encontrado' });
            }

            const [courses, trails] = await Promise.all([
                getCoursesByUserID(id).then((courses) => business.buildCoursesResponse(courses)),
                getCompletedTrails(user.networkLogin),
            ]);
            const sortedCourses = await business.sortCoursesByConcludedAt([courses, trails].flat());
            res.status(200).json(sortedCourses);

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
                }/certificates/find/${user.networkLogin}?clientId=${process.env.CLIENT_ID
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

    suggestContent: async (req, res) => {
        try {
            const dto = req.body;
            await validateSuggestions(dto);

            const updateOperations = {
                $addToSet: {
                    recommendedCourses: {
                        $each:
                            dto.recommendedCourses?.map((course) => ({
                                ...course,
                                createdAt: new Date(),
                            })) ?? [],
                    },
                    recommendedTrails: {
                        $each:
                            dto.recommendedTrails?.map((id) => ({
                                id,
                                createdAt: new Date(),
                            })) ?? [],
                    },
                },
            };

            RecommendedContent.findOneAndUpdate(
                { userId: dto.userId },
                updateOperations,
                {
                    upsert: true,
                    new: true,
                },
            );

            return res.status(200).json("Recomendado com sucesso");
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            console.error({ error: errorMessage });
            res.status(statusCode).json(errorMessage);
        }
    },

    findSuggestedContent: async (req, res) => {
        try {
            const userId = req.params.id;
            if (!userId) {
                return res.status(400).json('userId is required');
            }

            const suggestedContent = await RecommendedContent.findOne({ userId }, 'recommendedCourses recommendedTrails');
            const suggestions = await business.buildSuggestions(suggestedContent);

            res.status(200).json(suggestions);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            console.error({ error: errorMessage });
            res.status(statusCode).json(errorMessage);
        }
    }
};

// utils
const validateSuggestions = async (dto) => {
    if (!dto.userId) {
        throw new Error('userId is required');
    }

    if (dto.recommendedTrails?.[0])
        await Trail.find({ _id: { $in: dto?.recommendedTrails } });

    if (dto.recommendedCourses?.[0])
        await Promise.all([
            ClassModel.find({ _id: { $in: dto?.recommendedCourses?.map((course) => course.classId) } }),
            CourseModel.find({ _id: { $in: dto?.recommendedCourses?.map((course) => course.courseId) } }),
        ])
}

module.exports = managersUsersController;