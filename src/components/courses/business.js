/* eslint-disable no-async-promise-executor */

const { azureBlob } = require('../../utils/files');
const { User } = require('../users/model');
const { MaterialModel, ClassModel, ProgramModel, UsersWithProcessedTags, CourseModel } = require('./model');
const moment = require('moment');
const mongoose = require('mongoose');
const {
    formatDateWithoutHours,
    getDateTodayWithoutHours,
    addHours,
} = require('../../utils/functions');
const { checkEligibilityTagsAnd } = require('../sections/business');

module.exports = {
    uploadMaterial (material, author, folder) {
        return new Promise(async (resolve, reject) => {
            try {
                const nameFile = material.name.split('.');
                const url = await azureBlob(material, folder);
                const { _id } = await MaterialModel.create({
                    title: nameFile[0],
                    url,
                    author,
                });
                resolve(_id);
            } catch (error) {
                reject(error);
            }
        });
    },

    queryInstructorCourses (searchBy) {
        const today = getDateTodayWithoutHours();

        const searchByClasule = searchBy
            ? { $text: { $search: searchBy } }
            : {};
        const activeCourseClasule = {
            deleted: 0,
            status: 1,
        };

        const startDateClasule = {
            dateInitial: { $lte: today },
        };

        const endDateClasule = {
            dateFinal: { $gte: today },
        };

        return {
            ...searchByClasule,
            ...activeCourseClasule,
            // ...startDateClasule,
            // ...endDateClasule,
        };
    },

    verifyValidity (dateInitial, dateFinal) {
        const startDate = formatDateWithoutHours(dateInitial);
        const endDate = formatDateWithoutHours(dateFinal);
        const today = getDateTodayWithoutHours();

        if (
            startDate <= today &&
            (endDate >= today || endDate === 'Invalid Date')
        ) {
            return true;
        }
        return false;
    },

    getStoreUSers (store) {
        return new Promise(async (resolve, reject) => {
            try {
                const users = await User.find(
                    {
                        status: 'ATIVO',
                        // store: { $eq: store },
                    },
                    ['name', 'registration']
                ).sort({ name: 1 });

                resolve(users);
            } catch (error) {
                reject(error);
            }
        });
    },

    getCeaUsers () {
        return new Promise(async (resolve, reject) => {
            try {
                const users = await User.find(
                    {
                        status: 'ATIVO',
                    },
                    ['name', 'registration']
                );

                resolve(users);
            } catch (error) {
                reject(error);
            }
        });
    },

    getAppliedCourses (instructor, order, sort, skip, limit, searchBy, isAdmin) {
        return new Promise(async (resolve, reject) => {
            try {

                const query = isAdmin ?
                    {} : {
                        instructor: { $eq: instructor },
                    }
                let courses = await ClassModel.find(query,
                    ['users', 'createdAt', 'name', 'dateApplicationInitial', 'dateApplicationFinal']
                )
                    .populate({
                        path: 'courseID',
                        select: ['title',],
                        match: searchBy
                            ? {
                                $text: {
                                    $search: `"${searchBy}"`,
                                },
                            }
                            : {},
                    })
                    .sort({ [order]: sort })
                    .skip(parseInt(skip))
                    .limit(parseInt(limit));

                const total = await ClassModel.find(query,
                    ['users', 'createdAt']
                ).countDocuments();

                if (searchBy) {
                    courses = courses.filter(
                        (course) => course.courseID !== null
                    );
                }

                resolve({
                    courses,
                    total,
                });
            } catch (error) {
                reject(error);
            }
        });
    },

    getClassByID (classID) {
        return new Promise(async (resolve, reject) => {
            try {
                const { _doc } = await ClassModel.findById(classID)
                    .populate('materials')
                    .populate('instructor', 'name');

                resolve({
                    _id: classID,
                    ..._doc
                });
            } catch (error) {
                reject(error);
            }
        });
    },

    returnProgramaID (programTitle) {
        return new Promise(async (resolve, reject) => {
            try {
                let programID;
                const title = programTitle || 'Programa Livre';

                const program = await ProgramModel.findOne({
                    title: { $eq: title },
                });

                program
                    ? (programID = program._id)
                    : (programID = await ProgramModel.create({
                        title: programTitle,
                    }));

                resolve(programID);
            } catch (error) {
                reject(error);
            }
        });
    },

    getCoursesByUserID (userID) {
        return new Promise(async (resolve, reject) => {
            try {
                const classes = await ClassModel.find(
                    {
                        $or: [
                            { 'users.userID': userID },
                            { 'users._id': userID },
                            { 'users._id': mongoose.Types.ObjectId(userID) }
                        ]
                    },
                    [
                        'users',
                        'courseID',
                        'qrcode',
                        'dateApplicationInitial',
                        'dateApplicationFinal',
                        'name'
                    ]
                )
                    .populate({
                        path: 'courseID',
                        select: '-materials',
                    })
                    .populate({
                        path: 'materials',
                        match: { author: 'INSTRUTOR' },
                    })
                    .populate('instructor', ['name']);
                const classesFilter = classes.filter((item) => {
                    const usersFilter = item.users.filter((user) => {
                        if (user.presence && (user.userID === userID || user._id?.toString() === userID)) {
                            return user;
                        }
                    });

                    if (usersFilter.length > 0) return item;
                });

                resolve(classesFilter);
            } catch (error) {
                reject(error);
            }
        });
    },

    checkEligibility (eligibilityUser, tagsAnd, tagsOr) {
        const eligibilitytagsAnd = eligibilityUser.map(
            (eligibility) => eligibility.value
        );

        if (tagsAnd.length > 0) {
            const allEligibilitytagsAnd = tagsAnd.every((eligibility) =>
                eligibilitytagsAnd.includes(eligibility.value)
            );
            if (allEligibilitytagsAnd) {
                return true; // Acesso permitido
            }
        } else {
            const eligibilityTag = eligibilitytagsAnd.some((eligibility) =>
                tagsOr.some((tag) => tag.value === eligibility)
            );
            if (eligibilityTag) {
                return true; // Acesso permitido
            }
        }

        return false; // Acesso negado
    },

    /**
     * @param {string} courseId
     * @param {string} classId
     * @param {Record<string, string>[]} items
     * @returns {Promise<Record<string, string>[]>}
     */
    async processAttendanceListImport (courseId, classId, items) {
        const batchSize = 100;
        const total = items.length;
        const results = [];
        const nowDate = new Date();

        const courseInfo = await CourseModel.findById(courseId);
        const classInfo = await ClassModel.findById(classId);

        if (!courseInfo || !classInfo) {
            throw new Error('Curso ou turma não encontrados');
        }

        const courseMandatoryTags = courseInfo.mandatory;
        const courseOptionalTags = courseInfo.tags;

        const processedItems = [];

        const usersNetworkLogin = items.map((item) => item.networkLogin);

        const usersWithTags = await UsersWithProcessedTags.find({
            networkLogin: { $in: usersNetworkLogin.filter(Boolean) },
        });

        for (let index = 0; index < total; index += batchSize) {
            const batch = items.slice(index, index + batchSize);

            const result = await Promise.all(
                batch.map(async (item) => {
                    if (!item.networkLogin) {
                        return {
                            ...item,
                            message: 'Login não informado. Nenhuma ação foi realizada.',
                        }
                    }

                    if (processedItems.includes(item.networkLogin)) {
                        return {
                            ...item,
                            message: 'Login já processado. Nenhuma ação foi realizada.',
                        }
                    }

                    processedItems.push(item.networkLogin);

                    const userWithTags = usersWithTags.find(
                        ({ networkLogin }) => networkLogin === item.networkLogin
                    );

                    if (!userWithTags) {
                        return {
                            ...item,
                            message: 'Usuário não encontrado. Nenhuma ação foi realizada.',
                        }
                    }

                    const userIsEligible = checkEligibilityTagsAnd(
                        userWithTags.userTags,
                        courseMandatoryTags,
                        courseOptionalTags,
                    );

                    if (!userIsEligible) {
                        return {
                            ...item,
                            message: 'Usuário não tem elegibilidade. Nenhuma ação foi realizada.',
                        }
                    }

                    const indexUserInClass = classInfo.users.findIndex(
                        ({ _id }) => String(_id) === String(userWithTags._id)
                    );

                    const isPresence = ['SIM', 'S'].includes(item.presence?.toUpperCase());
                    const presenceDate = isPresence
                        ? (
                            item.presenceAt
                                ? moment(item.presenceAt)
                                    .add(3, 'hours')
                                    .set({
                                        hour: nowDate.getHours(),
                                        minute: nowDate.getMinutes(),
                                    })
                                    .toDate()
                                : nowDate
                        )
                        : null;
                    const grade = Number(item.grades ?? 0) > 100 ? 100 : Number(item.grades ?? 0);

                    if (indexUserInClass !== -1) {
                        await ClassModel.updateOne(
                            { _id: classInfo._id },
                            {
                                $set: {
                                    [`users.${indexUserInClass}.grades`]: grade,
                                    [`users.${indexUserInClass}.presence`]: isPresence,
                                    [`users.${indexUserInClass}.presenceAt`]: presenceDate,
                                    [`users.${indexUserInClass}.origin`]: 'instructor',
                                    [`users.${indexUserInClass}.updateAt`]: nowDate,
                                }
                            }
                        )
                    } else {
                        const userInfo = await User.findById(userWithTags._id, '_id name email registration networkLogin').lean();

                        await ClassModel.updateOne(
                            { _id: classInfo._id },
                            {
                                $push: {
                                    users: {
                                        ...userInfo,
                                        grades: grade,
                                        presence: isPresence,
                                        presenceAt: presenceDate,
                                        origin: 'instructor',
                                        updateAt: nowDate,
                                        createdAt: nowDate,
                                    }
                                }
                            }
                        );
                    }

                    return item;
                })
            );

            results.push(result);
        }

        return { results: results.flat(), classInfo, courseInfo };
    }
};
