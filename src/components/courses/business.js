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
    async processAttendanceListImport(courseId, classId, items) {
        const nowDate = new Date();

        const courseInfo = await CourseModel.findById(courseId);
        const classInfo = await ClassModel.findById(classId);

        if (!courseInfo || !classInfo) {
            throw new Error('Curso ou turma não encontrados');
        }

        const courseMandatoryTags = courseInfo.mandatory;
        const courseOptionalTags = courseInfo.tags;

        console.time('importAttendanceList - FINDING_USERS');
        const usersNetworkLogin = items.map((item) => item.networkLogin).filter(Boolean);

        const regexQueries = usersNetworkLogin.map(login => ({
            networkLogin: new RegExp(`^${login}$`, 'i')
        }));

        const users = await User.find({ $or: regexQueries })
            .select('_id networkLogin name email registration tags groupsAD onboarding')
            .lean();
        console.timeEnd('importAttendanceList - FINDING_USERS');

        console.time('importAttendanceList - PROCESSING');
        const usersWithError = [];
        const usersToUpdate = [];
        const usersToInsert = [];
        const processedLogins = new Map();

        const usersWithTagsMap = new Map(
            users.map((user) => [
                String(user.networkLogin).toUpperCase(),
                {
                    ...user,
                    userTags: user.onboarding
                        ? [...user.tags, ...user.groupsAD]
                        : [...user.tags, ...user.groupsAD, 'ELEGE_geral'],
                }
            ])
        );

        for (let index = 0; index < items.length; index += 1) {
            const item = items[index];

            if (!item.networkLogin) {
                usersWithError.push({
                    item,
                    message: 'Login não informado. Nenhuma ação foi realizada.',
                });

                continue;
            }

            const userMapKey = String(item.networkLogin).toUpperCase();

            if (processedLogins.has(userMapKey)) {
                usersWithError.push({
                    item,
                    message: 'Login duplicado. Nenhuma ação foi realizada.',
                });

                continue;
            }

            processedLogins.set(userMapKey, true);

            const user = usersWithTagsMap.get(userMapKey);

            if (!user) {
                usersWithError.push({
                    item,
                    message: 'Usuário não encontrado. Nenhuma ação foi realizada.',
                });

                continue;
            }

            const userIsEligible = checkEligibilityTagsAnd(
                user.userTags,
                courseMandatoryTags,
                courseOptionalTags,
            );

            if (!userIsEligible) {
                usersWithError.push({
                    item,
                    message: 'Usuário não tem elegibilidade. Nenhuma ação foi realizada.',
                });

                continue;
            }

            const indexUserInClass = classInfo.users.findIndex(
                ({ _id }) => String(_id) === String(user._id)
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

            const commonData = {
                grades: grade,
                presence: isPresence,
                presenceAt: presenceDate,
                origin: 'instructor',
                updateAt: nowDate,
            }

            // If user is in class, update user data
            if (indexUserInClass !== -1) {
                usersToUpdate.push({
                    item,
                    index: indexUserInClass,
                    info: commonData
                })
            }
            // If user is not in class, insert user data
            else {
                usersToInsert.push({
                    item,
                    info: {
                        ...user,
                        ...commonData,
                        createdAt: nowDate,
                    }
                });
            }
        }
        console.timeEnd('importAttendanceList - PROCESSING');

        console.time('importAttendanceList - UPDATING');
        if (usersToUpdate.length > 0) {
            await ClassModel.updateOne(
                { _id: classInfo._id },
                {
                    $set: usersToUpdate.reduce((acc, { index, info }) => {
                        acc[`users.${index}`] = info;
                        return acc;
                    }, {})
                }
            );
        }
        console.timeEnd('importAttendanceList - UPDATING');

        console.time('importAttendanceList - INSERTING');
        if (usersToInsert.length > 0) {
            await ClassModel.updateOne(
                { _id: classInfo._id },
                {
                    $push: {
                        users: {
                            $each: usersToInsert.map(({ info }) => info)
                        }
                    }
                }
            );
        }
        console.timeEnd('importAttendanceList - INSERTING');

        const results = [
            ...usersWithError.map(({ item, message }) => ({ ...item, message })),
            ...usersToUpdate.map(({ item }) => item),
            ...usersToInsert.map(({ item }) => item),
        ];

        return { results, classInfo, courseInfo };
    }
};
