/* eslint-disable no-async-promise-executor */

const { azureBlob } = require('../../utils/files');
const { User } = require('../users/model');
const { Group } = require('../groups/model');
const { MaterialModel, ClassModel, ProgramModel } = require('./model');

const {
    formatDateWithoutHours,
    getDateTodayWithoutHours,
    addHours,
} = require('../../utils/functions');

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
                        $or: [{ 'users.userID': userID, }, { 'users._id': userID, }]
                    },
                    [
                        'users',
                        'courseID',
                        'qrcode',
                        'dateApplicationInitial',
                        'dateApplicationFinal',
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
                        if (user.presence && (user.userID === userID || user._id === userID)) {
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
};
