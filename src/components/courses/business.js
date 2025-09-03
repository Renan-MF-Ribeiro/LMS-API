/* eslint-disable no-async-promise-executor */

const { azureBlob } = require('../../utils/files');
const { User } = require('../users/model');
const {
    MaterialModel,
    ClassModel,
    ProgramModel,
    UsersWithProcessedTags,
    CourseModel,
    CourseEvaluationModel,
} = require('./model');
const moment = require('moment');
const mongoose = require('mongoose');
const {
    formatDateWithoutHours,
    getDateTodayWithoutHours,
    addHours,
} = require('../../utils/functions');
const { checkEligibilityTagsAnd, canRegisterOrCancel } = require('../sections/business');
const eventsController = require('../calendar/events/controller');
const { Group } = require('../groups/model');
const ApiError = require('../../errors/ApiError');

module.exports = {
    uploadMaterial(material, author, folder) {
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

    queryInstructorCourses(searchBy) {
        const today = getDateTodayWithoutHours();

        const searchByClasule = searchBy ? { $text: { $search: searchBy } } : {};
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

    verifyValidity(dateInitial, dateFinal) {
        const startDate = formatDateWithoutHours(dateInitial);
        const endDate = formatDateWithoutHours(dateFinal);
        const today = getDateTodayWithoutHours();

        if (startDate <= today && (endDate >= today || endDate === 'Invalid Date')) {
            return true;
        }
        return false;
    },

    getStoreUSers(store) {
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

    getCeaUsers() {
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

    getAppliedCourses(instructor, order, sort, skip, limit, searchBy, isAdmin) {
        return new Promise(async (resolve, reject) => {
            try {
                const query = isAdmin
                    ? {}
                    : {
                        instructor: { $eq: instructor },
                    };

                if (searchBy) {
                    const possibleCourse = await CourseModel.find(
                        {
                            title: { $regex: searchBy, $options: 'i' },
                        },
                        ['_id']
                    );

                    query.$or = [
                        { courseID: { $in: possibleCourse.map((course) => course._id) } },
                        { name: { $regex: searchBy, $options: 'i' } },
                    ];
                }

                const courses = await ClassModel.find(query, [
                    'users',
                    'createdAt',
                    'name',
                    'dateApplicationInitial',
                    'dateApplicationFinal',
                ])
                    .populate({
                        path: 'courseID',
                        select: ['title'],
                    })
                    .sort({ [order]: sort })
                    .skip(parseInt(skip))
                    .limit(parseInt(limit));

                const total = await ClassModel.find(query, ['users', 'createdAt']).countDocuments();

                resolve({
                    courses,
                    total,
                });
            } catch (error) {
                reject(error);
            }
        });
    },

    getClassByID(classID) {
        return new Promise(async (resolve, reject) => {
            try {
                const { _doc } = await ClassModel.findById(classID)
                    .populate('materials')
                    .populate('instructor', 'name');

                resolve({
                    _id: classID,
                    ..._doc,
                });
            } catch (error) {
                reject(error);
            }
        });
    },

    returnProgramaID(programTitle) {
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

    async userHasSomePresence(userId, courseId, classId) {
        return await ClassModel.findOne({
            courseID: new mongoose.Types.ObjectId(courseId),
            _id: { $ne: classId },
            users: {
                $elemMatch: {
                    presence: true,
                    $or: [
                        { userID: userId },
                        { _id: userId },
                        { _id: mongoose.Types.ObjectId(userId) },
                    ],
                },
            }
        })
    },

    getCoursesByUserID(userID) {
        return new Promise(async (resolve, reject) => {
            try {
                const classes = await ClassModel.find(
                    {
                        $or: [
                            { 'users.userID': userID },
                            { 'users._id': userID },
                            { 'users._id': mongoose.Types.ObjectId(userID) },
                        ],
                    },
                    [
                        'users',
                        'courseID',
                        'qrcode',
                        'dateApplicationInitial',
                        'dateApplicationFinal',
                        'name',
                        'createdAt',
                        'location',
                        'minister',
                    ],
                    { sort: { createdAt: -1 } }
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


                const classesFilter = await Promise.all(
                    classes.map(async (item) => {
                        const usersFilter = item.users.filter((user) => {
                            if (
                                user.presence &&
                                (user.userID === userID || user._id?.toString() === userID.toString())
                            ) {
                                return user;
                            }
                        });

                        if (usersFilter.length > 0) {
                            const evaluationVerify = await CourseEvaluationModel.find({
                                classID: { $eq: item._id },
                                studentID: { $eq: usersFilter[0]._id },
                            });
                            return { ...item._doc, evaluationAnswered: evaluationVerify.length > 0 };
                        }
                        return null;
                    })
                );

                // Remove nulls (classes that didn't match)
                resolve(classesFilter.filter(Boolean));
            } catch (error) {
                reject(error);
            }
        });
    },

    checkEligibility(eligibilityUser, tagsAnd, tagsOr) {
        const eligibilitytagsAnd = eligibilityUser.map((eligibility) => eligibility.value);

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

        const regexQueries = usersNetworkLogin.map((login) => ({
            networkLogin: new RegExp(`^${login}$`, 'i'),
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
                },
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

            const tagValues = courseOptionalTags.map(t => t.value);

            const groups = await Group.find(
                { "tags.value": { $in: tagValues } },
                "name"
            );

            const courseOptionalTagsValues = groups.map(group => group.name);

            const userIsEligible = checkEligibilityTagsAnd(
                user.userTags,
                courseMandatoryTags,
                courseOptionalTagsValues
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
                ? item.presenceAt
                    ? moment(item.presenceAt)
                        .add(3, 'hours')
                        .set({
                            hour: nowDate.getHours(),
                            minute: nowDate.getMinutes(),
                        })
                        .toDate()
                    : nowDate
                : null;
            const grade = Number(item.grades ?? 0) > 100 ? 100 : Number(item.grades ?? 0);

            const commonData = {
                grades: grade,
                presence: isPresence,
                presenceAt: presenceDate,
                origin: 'instructor',
                updateAt: nowDate,
            };

            // If user is in class, update user data
            if (indexUserInClass !== -1) {
                usersToUpdate.push({
                    item,
                    index: indexUserInClass,
                    info: {
                        ...user,
                        ...commonData,
                        userID: user._id,
                        createdAt: nowDate,
                    },
                });
            }
            // If user is not in class, insert user data
            else {
                usersToInsert.push({
                    item,
                    info: {
                        ...user,
                        ...commonData,
                        userID: user._id,
                        createdAt: nowDate,
                    },
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
                    }, {}),
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
                            $each: usersToInsert.map(({ info }) => info),
                        },
                    },
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
    },

    async searchCourseBy(user, tags, start, end, courseId) {
        if (!user) {
            return [];
        }

        const events = await eventsController.getCalendarEventsByDate(start, end, user, tags);
        let calendarEvents = events;

        if (courseId) {
            calendarEvents = events.filter((event) => {
                return event?.content?.courseID?.toString() === courseId?.toString();
            });
        }

        return calendarEvents;
    },

    async getCoursesByIds(courseIds) {
        const query = {
            deleted: 0,
            $or: [{ datefinal: null }, { datefinal: { $gte: new Date() } }],
        };

        if (courseIds) {
            query._id = { $in: courseIds };
        }
        return await CourseModel.find(query, 'title thumbPath banner').lean();
    },

    async listJoin(user, classId) {
        let course = await ClassModel.findOne({ _id: classId });;

        if (!course) {
            throw new ApiError('Turma não encontrada.', 404);
        }

        const hasLimit = typeof course.limit === 'number' && course.limit > 0;

        if (hasLimit && course.users.length >= course.limit) {
            throw new ApiError('Não foi possível se inscrever: turma cheia.', 409);
        }

        const classesFromCourse = await ClassModel.find({
            courseID: course.courseID,
        });

        const currentClasses = classesFromCourse.filter((c) => {
            const canRegister = canRegisterOrCancel(c.dateApplicationInitial, c.registrationDeadline)
            const canCancel = canRegisterOrCancel(c.dateApplicationInitial, c.cancellationDeadline)

            return canRegister && canCancel
        })

        const removalPromises = currentClasses.map(async (classFromCourse) => {
            if (classFromCourse._id.equals(classId)) {
                return Promise.resolve();
            }

            const userInClass = classFromCourse.users.find(
                (u) =>
                    (u._id && u._id.toString() === user._id.toString()) ||
                    (u.userID && u.userID.toString() === user._id.toString())
            );

            if (!userInClass) {
                return Promise.resolve();
            }

            if (userInClass.presence === true) {
                throw new ApiError('Não é possível mais cancelar sua inscrição nesta turma.', 400);
            }

            return ClassModel.findOneAndUpdate(
                { _id: classFromCourse._id },
                {
                    $pull: {
                        users: {
                            $or: [
                                { _id: user._id, presence: false },
                                { userID: user._id, presence: false },
                            ],
                        },
                    },
                }
            );
        });

        await Promise.all(removalPromises);

        course = await ClassModel.findOneAndUpdate(
            {
                _id: classId,
                'users._id': { $ne: user._id },
                'users.userID': { $ne: user._id },
            },
            {
                $addToSet: {
                    users: {
                        _id: user._id,
                        userID: mongoose.Types.ObjectId(user._id),
                        presence: false,
                        grades: 0,
                        name: user.name,
                        registration: user.registration,
                        createdAt: moment().utc().format(),
                        origin: 'user',
                    },
                },
            },
            { new: true }
        );

        return course;
    },

    /**
     * Processes location data and determines if it's a URL or physical location
     * @param {string} location - The location string to process
     * @returns {Object} Processed location data
     */
    async processLocation(location) {
        const LINK_REGEX = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

        if (!location) {
            return {
                isLocationUrl: false,
                onlineLink: null,
                displayLocation: '',
                processedLocation: location
            };
        }

        const isLocationUrl = LINK_REGEX.test(location);
        
        return {
            isLocationUrl,
            onlineLink: isLocationUrl ? location : null,
            displayLocation: isLocationUrl ? 'Online' : location,
            processedLocation: isLocationUrl ? null : location
        };
    }

    /**
     * Prepares class/course body for message sending by handling location appropriately
     * @param {Object} bodyData - The class or course data
     * @param {string} location - The location string
     * @returns {Object} Processed body data for messaging
     */
    async prepareBodyForMessage(bodyData, location) {
        const { isLocationUrl, onlineLink } = processLocation(location);
        const processedBody = { ...bodyData };
        
        if (isLocationUrl) {
            delete processedBody.location;
            processedBody.onlineLink = onlineLink;
        }
        
        return processedBody;
    }

    /**
     * Gets display text for location in messages
     * @param {string} location - The location string
     * @returns {string} Display text for the location
     */
    async getLocationDisplayText(location) {
        const { displayLocation } = processLocation(location);
        return displayLocation;
    }


    /**
     * @param {Array} data
     * @param {Array} classesFromUser
     * @param {string} userId
     * @returns {Array}
     */
    enrichCoursesWithClasses(data, classesFromUser, userId) {
        return data.map((course) => {
            let classes = classesFromUser.filter(c => c.courseID.toString() == course._id.toString());
            classes = classes.map(c => {
                const currentUser = c.users.find(u => u.userID == userId || u._id == userId);
                const userGrades = currentUser.grades;
                const passed = userGrades >= course.passingScore;
                const hasCertificate = course.certificate && passed;
                return {
                    _id: c._id,
                    course,
                    name: c.name,
                    dateApplicationFinal: c.dateApplicationFinal,
                    dateApplicationInitial: c.dateApplicationInitial,
                    passed: currentUser.presence ? passed : null,
                    userGrades: currentUser.presence ? userGrades : null,
                    hasCertificate,
                    presenceAt: currentUser.presenceAt,
                };
            });
            return {
                ...course,
                classes
            };
        });
    },

    async removeUsersFromClass(classId, userIds) {
        //must receive array of userIds
        return await ClassModel.findOneAndUpdate(
            { _id: classId },
            { $pull: { users: { _id: { $in: userIds.map((id) => mongoose.Types.ObjectId(id)) } } } }
        );
    }
};
