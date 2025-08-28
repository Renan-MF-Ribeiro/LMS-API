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
const courseBusiness = require('../../courses/business');
const { Types } = require('mongoose');
const ApiError = require('../../../errors/ApiError');

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
            const lastApplicationAt = await matricesApi.get(`/users/last-application/${userId}`);
            payload.lastApplicationAt = lastApplicationAt?.data?.data || null;
        }

        res.status(httpStatus.OK).send(payload);

    },

    findManagedUsers: async (req, res) => {
        try {
            let [users, isMatrixActive] = await Promise.all([
                business.findManagedUsers(req),
                business.isMatrixActive(),
            ]);

            if (!users?.[0]) {
                return res.status(httpStatus.OK).json([]);
            }

            if (isMatrixActive) {
                users = await business.handleUsersWhenMatrixIsActive(req.query, users);
            }
            const paginatedUsers = business.paginateUsers(req, users);
            res.status(200).json(paginatedUsers);
        } catch (error) {
            const message = error.response?.data?.message ?? error.message;
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = message ?? 'Internal server error';
            console.log({ error: errorMessage });
            res.status(statusCode).json(errorMessage);
        }
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

            const receivedUsers = dto.userId || dto.usersIds || dto.users;
            const userArray = Array.isArray(receivedUsers) ? receivedUsers : [receivedUsers];

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

            await RecommendedContent.updateMany(
                { userId: { $in: userArray?.map((user) => new Types.ObjectId(user)) } },
                updateOperations,
                {
                    upsert: true,
                    new: true,
                },
            );

            if (dto.recommendedCourses?.length > 0 && userArray?.length > 0) {
                const users = await User.find({ _id: { $in: userArray } });

                if (!users?.[0]) {
                    throw new ApiError('Usuário(s) não encontrado', 404);
                }

                const classId = dto.recommendedCourses[0]?.classId;
                console.log({ classId });
                const classToJoin = await ClassModel.findOne({ _id: classId });
                const hasLimit = typeof classToJoin.limit === 'number' && classToJoin.limit > 0;

                if (hasLimit) {
                    const currentStudentsCount = classToJoin.users ? classToJoin.users.length : 0;
                    const availableSpots = classToJoin.limit - currentStudentsCount;

                    if (users.length > availableSpots) {
                        throw new ApiError(`Não é possível adicionar ${users.length} usuários. Vagas disponíveis: ${availableSpots} de ${classToJoin.limit} total.`, 409);
                    }

                    if (availableSpots <= 0) {
                        throw new ApiError(`Classe está cheia. Limite: ${classToJoin.limit}, Usuários atuais: ${currentStudentsCount}`, 409);
                    }
                }

                // Em nosso fluxo atual, apenas um curso pode ser recomendado por vez.
                // Portanto, não é necessário iterar sobre recommendedCourses (ainda).
                //for await (const recommendedCourse of dto.recommendedCourses) {
                for await (const user of users) {
                    await courseBusiness.listJoin(user, dto.recommendedCourses[0].classId);
                }
                //}
                return res.status(200).json("Usuário(s) adicionado(s) com sucesso");
            }

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
    },

    removeUserFromClass: async (req, res) => {
        try {
            const classId = req.body?.classId || req.query?.classId;
            const userIds = req.body?.userIds || req.query?.userId;

            if (!classId || !userIds || userIds?.length === 0) {
                return res.status(400).json('Class ID and user IDs are required');
            }
            const usersArray = Array.isArray(userIds) ? userIds : [userIds];

            await courseBusiness.removeUsersFromClass(classId, usersArray);
            res.status(200).json('Usuário(s) removido(s) com sucesso');
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
    if (!dto?.userId && dto?.users?.length && !dto?.usersIds?.length) {
        throw new Error('user is required');
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