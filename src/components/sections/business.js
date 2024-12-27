/* eslint-disable no-async-promise-executor */
const {
    formatDateWithoutHours,
    getDateTodayWithoutHours,
    calculateDiffDate,
    getTagsGroupsByToken,
    getUserByToken,
    getTagsGroups,
    isSCORMCompleted,
} = require('../../utils/functions');
const { Group } = require('../groups/model');
const { CourseModel, WaitListModel, ClassModel, UsersWithProcessedTags } = require('../courses/model');
const { Tracking } = require('../tracking/model');
const { Section, DEFAULT_TYPES } = require('./model');
const { default: axios } = require('axios');
const moment = require('moment');
const { TrailViews } = require('../trails/trail-views.model');
const { listTrainingSectionsStatus } = require('../assessment/business');
const { Trail } = require('../trails/model');
const { cloneDeep } = require('lodash');
const { ObjectId } = require('mongoose').Types

const isSectionTrailInfo = (trail) => (trail.type === 'trail' && ObjectId.isValid(trail._id)) || ObjectId.isValid(trail);

const isValidSectionTrailInfo = (trail) => !ObjectId.isValid(String(trail));

const getSectionTrailId = trail => ObjectId.isValid(trail) ? trail : (trail._id ?? null);

async function populateSectionTrails(sections, options) {
    const newSections = cloneDeep(sections);

    for await (const section of newSections) {
        if (!section?.trails?.length) continue;

        const trailsIds = section.trails
            .filter(trail => isSectionTrailInfo(trail))
            .map(trail => getSectionTrailId(trail));

        const query = Trail.find({ _id: { $in: trailsIds } });

        if (options?.select) query.select(options.select);

        const trails = await query.lean();

        section.trails = section.trails.map(trail => {
            if (isSectionTrailInfo(trail)) {
                const trailId = getSectionTrailId(trail);
                return trails.find(t => String(t._id) === String(trailId)) ?? trail;
            }

            return trail;
        });
    }

    return newSections;
}

async function setAssessmentHistoricOnSections(userId, sections) {
    const userWithTags = await UsersWithProcessedTags.findById(userId);
    const dataAssessmentHistoric = await listTrainingSectionsStatus(userId, userWithTags.userTags);

    return cloneDeep(sections).map(currentSection => {
        if (!currentSection.isTraining) return currentSection;

        const section = cloneDeep(currentSection);

        const trainingSectionInfo = dataAssessmentHistoric.find(info => String(info.trainingSectionId) === String(section._id))

        if (trainingSectionInfo) {
            const optionalTrails = trainingSectionInfo.optionalTrailsId ?? [];
            const isBlocked = trainingSectionInfo.isBlocked ?? false;
            const hasHistoric = trainingSectionInfo?.hasHistoric ?? false;
            const cycleMessage = trainingSectionInfo.cycleMessage ?? null;
            const cycleImage = trainingSectionInfo.cycleImage ?? null;
            const exceptionTrainingTrails = trainingSectionInfo.exceptionTrainingTrails ?? [];
            const hasCertificate = !!section.certificateLayout;
            const cycleShowTrailResults = trainingSectionInfo?.cycleShowTrailResults ?? true;
            const exceptionCertificateTrails = section.exceptionCertificateTrails ?? [];

            section.trails?.forEach(trail => {
                if (optionalTrails.includes(String(trail._id))) {
                    trail.isOptional = true;
                }

                if (exceptionTrainingTrails.includes(String(trail._id))) {
                    trail.isException = true;
                }

                if (exceptionCertificateTrails.includes(String(trail._id))) {
                    trail.isCertificateException = true;
                }
            });

            const filteredTrails = section.trails
                ?.filter(
                    trail => !['default', 'assessment', 'separator', 'certificate'].includes(trail.type)
                )
                ?.filter(trail => !trail.isException)
                ?.filter(trail => !trail.isOptional)
                ?.filter(trail => !trail.isCertificateException)
                ?? [];

            const isCompleted = filteredTrails.every(trail => trail.completion === 1);

            const messages = trainingSectionInfo.messages ?? [];

            if (!hasHistoric && section.displayType === 'hidden') {
                section.trails = section.trails.filter(trail => trail.isException || (trail.type && trail.type !== 'trail'));
            }

            section.hasAssessment = true
            section.isBlocked = isBlocked;
            section.isCompleted = hasHistoric && isCompleted;
            section.hasCertificate = hasCertificate;
            section.optionalTrails = optionalTrails;
            section.cycleMessage = cycleMessage;
            section.cycleImage = cycleImage;
            section.cycleShowTrailResults = cycleShowTrailResults;
            section.exceptionTrainingTrails = exceptionTrainingTrails;
            section.messages = messages;
        }
        else {
            const isCompleted = section.trails
                ?.filter(
                    trail => !['default', 'assessment', 'separator', 'certificate'].includes(trail.type)
                )
                ?.every(trail => trail.completion === 1);

            section.hasAssessment = false;
            section.isBlocked = false;
            section.isCompleted = isCompleted;
            section.hasCertificate = !!section.certificateLayout;
        }

        const completedTrailsType = section.completedTrailsType ?? 'optional';

        if (completedTrailsType === 'hidden') {
            section.trails = section.trails.filter(trail => !trail.isOptional);
        }

        if (section.trails?.length && !section.trails.some(trail => ['default', 'assessment', 'certificate'].includes(trail.type))) {
            const [firstItem] = section.trails;

            if (firstItem.type === 'separator') {
                section.trails.shift();
            }

            section.trails.unshift({
                type: 'default',
                title: '',
                id: 'default',
            });
        }

        return section;
    });
}

module.exports = {
    checkIfTheTrackIsValid (trail) {
        const today = getDateTodayWithoutHours();

        if (trail.classGroup) {
            const startGroup = formatDateWithoutHours(trail.classGroup.startDate);

            if (!(startGroup <= today)) {
                return false;
            }
        }

        if (trail.startDate && trail.endDate) {
            const startDate = formatDateWithoutHours(trail.startDate);
            const endDate = formatDateWithoutHours(trail.endDate);

            if (!(startDate <= today && endDate >= today)) {
                return false;
            }
        }
        return true;
    },

    calculateDiffDateTrail (trail) {
        const today = getDateTodayWithoutHours();
        const diffCreate = calculateDiffDate(
            today,
            formatDateWithoutHours(trail.createdAt),
            'days'
        );
        const diffUpdate = calculateDiffDate(
            today,
            formatDateWithoutHours(trail.updatedAt),
            'days'
        );

        if (diffCreate <= 30 || diffUpdate <= 30) return true;
        return false;
    },

    checkIfUserCanSeeTheTrail (trail, userTags) {
        const trailTags = trail.tags;
        let flag = false;

        for (const t of trailTags) {
            const filter = userTags.filter((val) => {
                return val.value === t.value;
            });

            if (filter.length > 0) flag = true;
        }

        if (flag) return true;
        return false;
    },
    getTrailCompletion (trail) {
        const completed = trail.items.find((val) => {
            return val.completion === 1;
        });
        const incomplete = trail.items.find((val) => {
            return val.completion != null && val.completion >= 0 && val.completion < 1;
        });
        const notAttempted = trail.items.find((val) => {
            return val.completion === null;
        });

        if (incomplete) {
            return 0;
        } else if (completed && notAttempted) {
            return 0;
        } else if (completed && !incomplete && !notAttempted) {
            return 1;
        } else {
            return null;
        }
    },
    filterTrails (filter, trails, elegibleTags) {
        const filteredTrails = [];
        for (const i in trails) {
            let completed = false;
            let incompleted = false;
            let necessary = false;
            let highlighted = false;
            let mostRecent = false;
            let notStarted = false;
            if (filter.completed === 'true') {
                completed = isCompleted(trails[i]);
            }
            if (filter.incompleted === 'true') {
                incompleted = isIncomplete(trails[i]);
            }
            if (filter.necessary === 'true') {
                necessary = isNecessary(trails[i], elegibleTags);
            }
            if (filter.highlights === 'true') {
                highlighted = isHighlight(trails[i]);
            }
            if (filter.most_recent === 'true') {
                mostRecent = isMostRecent(trails[i]);
            }
            if (filter.uninitiated === 'true') {
                notStarted = isNotStarted(trails[i]);
            }
            if (completed || incompleted || necessary || highlighted || mostRecent || notStarted) {
                filteredTrails.push(trails[i]);
            }
        }
        return filteredTrails;
    },
    setTrailMandatory (trail, tags) {
        const mandatoryTags = trail.mandatory;

        if (!mandatoryTags || !mandatoryTags.length) {
            return;
        }

        const hasMandatory = mandatoryTags.reduce((hasMandatory, tag) => {
            if (hasMandatory) {
                return true;
            }

            const filter = tags.filter((_tag) => _tag.value === tag.value);

            return filter.length > 0;
        }, false);

        if (!hasMandatory) {
            trail.items = trail.items.map((item) => {
                item.mandatory = false;
                return item;
            });
        }
    },
    getTagsElegiblesByToken (req) {
        return new Promise(async (resolve, reject) => {
            try {
                const user = await getUserByToken(req);
                const tags = await getTagsGroupsByToken(req);
                const today = getDateTodayWithoutHours();

                if (user.classGroups.length > 0) {
                    for (const classGroup of user.classGroups) {
                        tags.push({
                            display: classGroup.groupCode,
                            value: classGroup.groupCode,
                        });
                    }
                }

                if (user.tags.length > 0) {
                    for (const tag of user.tags) {
                        const diff = calculateDiffDate(
                            today,
                            formatDateWithoutHours(tag.createdAt),
                            'days'
                        );
                        delete tag.createdAt;
                        if (diff <= 30) tags.push(tag);
                    }
                }
                resolve(tags);
            } catch (error) {
                reject(error);
            }
        });
    },

    getGroupCodesByToken (req, tags) {
        return new Promise(async (resolve, reject) => {
            try {
                const user = await getUserByToken(req);
                const classGroups = [];

                if (user.classGroups.length > 0) {
                    for (const tag of tags) {
                        for (const classGroup of user.classGroups) {
                            if (classGroup.groupCode === tag.value) {
                                classGroups.push(classGroup);
                            }
                        }
                    }
                }

                resolve(classGroups);
            } catch (error) {
                reject(error);
            }
        });
    },

    getTagsElegibles (user) {
        return new Promise(async (resolve, reject) => {
            try {
                const namesGroups = user.groupsAD;
                const arrGroupsIDS = [];

                for (const p in namesGroups) {
                    const group = await Group.findOne({
                        name: { $eq: namesGroups[p] },
                    });
                    if (group) arrGroupsIDS.push(group._id);
                }

                const tags = await getTagsGroups(arrGroupsIDS);
                resolve(tags);
            } catch (error) {
                reject(error);
            }
        });
    },

    checkItemCompleted (item, user) {
        return new Promise(async (resolve, reject) => {
            try {
                let completion = null;

                const tracking = await Tracking.findOne({
                    item: { $eq: item.itemID._id },
                    userLogin: { $eq: user.networkLogin },
                });

                if (tracking) {
                    if (tracking.kind === 'SCORMTracking' || tracking.kind === 'ExamTracking') {
                        if (
                            tracking.lessonStatus === 'FAILED' ||
                            tracking.lessonStatus === 'failed'
                        ) {
                            completion = 2;
                        } else {
                            completion = isSCORMCompleted(tracking.lessonStatus) ? 1 : 0;
                        }
                    } else {
                        completion = tracking.completion;
                    }
                }

                /*
                if (item.itemID.kind === 'ExamItem') {
                    const data = await HistoricEvaluation
                        .findOne({
                            user: { $eq: user._id },
                            item: { $eq: item.itemID._id },
                        })
                        .sort({ createdAt: -1 })
                        .limit(1)

                    if (!data) {
                        completion = null
                    } else if (data.amountOfQuestions === data.amountQuestionsAnswered) {
                        const rating = await calculateRatingEvaluation(data.amountQuestionsCorrect, data.amountOfQuestions)
                        if (rating.values.correct >= item.itemID.passingScore) completion = 1
                        if (rating.values.correct < item.itemID.passingScore) completion = 2
                    } else {
                        completion = 0
                    }
                } */

                resolve(completion);
            } catch (error) {
                reject(error);
            }
        });
    },

    async elegiblesContents (trails) {
        return new Promise(async (resolve, reject) => {
            try {
                const arrSections = [];
                const sections = await Section.find({
                    deleted: 0,
                    active: 1,
                    default: false,
                }).lean();

                sections.forEach((section) => {
                    const sectionTrails = section.trails
                        .map(trail => {
                            return trails.find(t => String(t._id) === String(getSectionTrailId(trail))) ?? trail;
                        })
                        .filter(trail => isValidSectionTrailInfo(trail) && checkIfTheTrackIsValid(trail))

                    if (sectionTrails.length > 0) {
                        arrSections.push({
                            ...section, trails: sectionTrails
                        });
                    };
                });

                resolve(arrSections);
            } catch (error) {
                reject(error);
            }
        });
    },

    async mandatorySections (trails, tags) {
        return new Promise(async (resolve, reject) => {
            try {
                const section = await Section.findOne({
                    defaultType: DEFAULT_TYPES.MANDATORY,
                    active: 1,
                }).lean();

                if (section) {
                    const sortFnc =
                        section && section.ordination !== undefined && section.ordination === 0
                            ? function (a, b) {
                                return b.createdAt - a.createdAt;
                            }
                            : function (a, b) {
                                return a.title.localeCompare(b.title);
                            };

                    trails = trails.filter((trail) => {
                        const trailItems = trail.items.filter((item) =>
                            item.mandatory ? item.mandatory : false
                        );
                        return trailItems.length > 0;
                    });

                    trails = trails.filter((trail) => {
                        for (var m in trail.mandatory) {
                            for (const t in tags) {
                                if (trail.mandatory[m].value === tags[t].value) {
                                    return true;
                                }
                            }
                        }

                        return false;
                    });

                    trails.sort(sortFnc);

                    section.trails = trails;
                }

                resolve(trails.length > 0 ? section : []);
            } catch (error) {
                reject(error);
            }
        });
    },

    async recentsSections (trails) {
        return new Promise(async (resolve, reject) => {
            try {
                const section = await Section.findOne({
                    defaultType: DEFAULT_TYPES.RECENTS,
                    active: 1,
                }).lean();

                if (section) {
                    const sortFnc =
                        section && section.ordination !== undefined && section.ordination === 0
                            ? function (a, b) {
                                return b.createdAt - a.createdAt;
                            }
                            : function (a, b) {
                                return a.title.localeCompare(b.title);
                            };
                    for (const trail of trails) {
                        const flag = calculateDiffDateTrail(trail);
                        if (flag) {
                            section.trails.push(trail);
                        }
                    }

                    section.trails.sort(sortFnc);
                }

                resolve(section && section.trails.length > 0 ? section : []);
            } catch (error) {
                reject(error);
            }
        });
    },

    async keepLearningSections (trails) {
        return new Promise(async (resolve, reject) => {
            try {
                const section = await Section.findOne({
                    defaultType: DEFAULT_TYPES.KEEP_LEARNING,
                    active: 1,
                }).lean();

                if (section) {
                    const sortFnc =
                        section && section.ordination !== undefined && section.ordination === 0
                            ? function (a, b) {
                                return b.createdAt - a.createdAt;
                            }
                            : function (a, b) {
                                return a.title.localeCompare(b.title);
                            };

                    for (const trail of trails) {
                        if (trail.completion === 0 || !trail.completion) {
                            section.trails.push(trail);
                        }
                    }

                    section.trails.sort(sortFnc);
                }

                resolve(section && section.trails.length > 0 ? section : []);
            } catch (error) {
                console.log(error);
                reject(error);
            }
        });
    },

    async favoriteSections (trails, userId) {
        return new Promise(async (resolve, reject) => {
            try {
                const section = await Section.findOne({
                    defaultType: DEFAULT_TYPES.FAVORITES,
                    active: 1,
                }).lean();

                const uri = `${process.env.API_SOCIAL}/home/favorite/${userId}`;
                const { data } = await axios.get(uri);
                const favoriteTrails = data.map((f) => {
                    if (f.target) {
                        return f.trailId;
                    }
                });
                if (section) {
                    const sortFnc =
                        section && section.ordination !== undefined && section.ordination === 0
                            ? function (a, b) {
                                return b.createdAt - a.createdAt;
                            }
                            : function (a, b) {
                                return a.title.localeCompare(b.title);
                            };

                    for (const trail of trails) {
                        if (favoriteTrails.includes(String(trail._id))) {
                            section.trails.push(trail);
                        }
                    }
                    section.trails.sort(sortFnc);
                }

                resolve(section && section.trails.length > 0 ? section : []);
            } catch (error) {
                console.log(error);
                reject(error);
            }
        });
    },

    async concludedSections (trails) {
        return new Promise(async (resolve, reject) => {
            try {
                const section = await Section.findOne({
                    defaultType: DEFAULT_TYPES.CONCLUDED,
                    active: 1,
                }).lean();

                if (section) {
                    const sortFnc =
                        section && section.ordination !== undefined && section.ordination === 0
                            ? function (a, b) {
                                return b.createdAt - a.createdAt;
                            }
                            : function (a, b) {
                                return a.title.localeCompare(b.title);
                            };

                    for (const trail of trails) {
                        if (trail.completion) {
                            section.trails.push(trail);
                        }
                    }

                    section.trails.sort(sortFnc);
                }

                resolve(section && section.trails.length > 0 ? section : []);
            } catch (error) {
                console.log(error);
                reject(error);
            }
        });
    },

    async courseInSections (tags, userId) {
        return new Promise(async (resolve, reject) => {
            try {
                const section = await Section.findOne({
                    defaultType: DEFAULT_TYPES.COURSES,
                    active: 1,
                }).lean();
                let elegibleCourses = await CourseModel.find({
                    tags: { $in: tags },
                    deleted: { $eq: 0 },
                    status: { $eq: 1 },
                })
                    .select({
                        title: 1,
                        thumbPath: 1,
                        _id: 1,
                        description: 1,
                        passingScore: 1,
                        certificate: 1,
                        certificateLayout: 1,
                        workload: 1,
                        instructor: 1,
                        banner: 1,
                        startDate: 1,
                        endDate: 1,
                        highlighted: 1,
                    })
                    .lean();

                const coursePromises = elegibleCourses.map(async (course) => {
                    const alreadyJoined = await WaitListModel.findOne({
                        userID: userId,
                        courseID: course._id,
                        sent: false,
                    });

                    const today = new Date()
                    const classesFromCourse = await ClassModel.find({
                        courseID: course._id
                    }).populate({
                        path: 'materials',
                        match: { author: 'INSTRUTOR' },
                    })
                        .populate('instructor', ['name']);;

                    let inWaitList = false;
                    if (alreadyJoined) {
                        inWaitList = true;
                    }
                    let certificateElegible = false
                    let certificateData = null

                    classesFromCourse.forEach((e) => {
                        if (String(e.courseID._id) === String(course._id)) {
                            const userInClass = e.users.find((user) => user._id?.toString() == userId || user.userID == userId)
                            let grade = 0
                            let presence = false
                            if (userInClass) {
                                presence = userInClass.presence;
                                grade = userInClass.grades ? userInClass.grades : 0;
                                const passingScore = course.passingScore ? course.passingScore : 0;
                                certificateElegible = grade >= passingScore;

                            }
                            if (certificateElegible && presence)
                                certificateData = {
                                    completionAt: e.dateApplicationFinal,
                                    qrcode: e.qrcode,
                                    certificate: course.certificate,
                                    certificateLayout: course.certificateLayout,
                                    studentMaterials: e.materials,
                                    workload: course.workload,
                                    instructor: e.instructor,
                                    grade: grade,
                                    status: certificateElegible,
                                };

                            course.presence = presence;
                            course.completionAt = e.dateApplicationFinal;
                            course.instructor = e.instructor;

                        }
                    });
                    const classes = certificateData ? [] : classesFromCourse.map((classFromCourse) => {
                        const inClass = classFromCourse.users.some((user) => user._id == userId || user.userID == userId)

                        return classFromCourse.dateApplicationFinal <= today ? null : {
                            _id: classFromCourse._id,
                            name: classFromCourse.name,
                            dateApplicationInitial: classFromCourse.dateApplicationInitial,
                            dateApplicationFinal: classFromCourse.dateApplicationFinal,
                            location: classFromCourse.location,
                            status: getClassStatus(classFromCourse, inClass),
                        };
                    }).filter((classCourse) => classCourse)


                    course.certificateElegible = certificateData;
                    course.inWaitList = inWaitList;
                    course.classes = classes;
                    course.hasClasses = classes.length > 0;
                    return course;
                });

                elegibleCourses = await Promise.all(coursePromises);



                if (section) {
                    const sortFnc =
                        section && section.ordination !== undefined && section.ordination === 0
                            ? function (a, b) {
                                return -1;
                            }
                            : function (a, b) {
                                return a.title?.localeCompare(b.title);
                            };
                    for (const course of elegibleCourses) {
                        section.trails.push(course);
                    }

                    section.trails.sort(sortFnc);
                }

                resolve(section && section.trails.length > 0 ? section : []);
            } catch (error) {
                console.log(error);
                reject(error);
            }
        });
    },

    async mostSeenSections (trails) {
        return new Promise(async (resolve, reject) => {
            try {
                const section = await Section.findOne({
                    defaultType: DEFAULT_TYPES.MOST_SEEN,
                    active: 1,
                }).lean();

                if (section) {
                    const lastNinetyDays = moment().subtract(90, 'days').toISOString();
                    const mostSeenTrails = await TrailViews.aggregate([
                        {
                            $match: {
                                trailId: {
                                    $in: trails.map(({ _id }) => _id),
                                },
                            },
                        },
                        {
                            $project: {
                                trailId: 1,
                                count: {
                                    $sum: {
                                        $reduce: {
                                            input: '$views',
                                            initialValue: 0,
                                            in: {
                                                $cond: {
                                                    if: { $gte: ['$$this.date', lastNinetyDays] },
                                                    then: { $add: ['$$value', '$$this.count'] },
                                                    else: { $add: ['$$value', 0] },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        {
                            $sort: {
                                count: -1,
                            },
                        },
                        {
                            $limit: 10,
                        },
                        {
                            $lookup: {
                                from: 'trails',
                                as: 'trail',
                                foreignField: '_id',
                                localField: 'trailId',
                            },
                        },
                        {
                            $unwind: '$trail',
                        },
                        {
                            $lookup: {
                                from: 'items',
                                as: 'trailItems',
                                foreignField: '_id',
                                localField: 'trail.items.itemID'
                            }
                        },
                        {
                            $addFields: {
                                'trail.items': {
                                    $map: {
                                        input: '$trail.items',
                                        as: 'item',
                                        in: {
                                            $mergeObjects: [
                                                '$$item',
                                                {
                                                    itemID: {
                                                        $arrayElemAt: [
                                                            '$trailItems',
                                                            {
                                                                $indexOfArray: ['$trailItems._id', '$$item.itemID'],
                                                            },
                                                        ],
                                                    },
                                                },
                                            ],
                                        },
                                    },
                                },
                            },
                        },
                        {
                            $project: {
                                trail: 1,
                                count: 1,
                                _id: 0,
                            },
                        },
                    ]);

                    section.trails = mostSeenTrails.map(({ trail, count }) => {
                        const completion = trails.find(t => t._id.toString() === trail._id.toString())?.completion || 0;
                        return { 
                            ...trail, 
                            count,
                            completion,
                            confidential: trail.confidential ?? false 
                        };
                    })
                }
                // console.log(section.trails)
                resolve(trails.length > 0 ? section : []);
            } catch (error) {
                reject(error);
            }
        });
    },

    /**
     * Verifica se o usuário é elegível conforme as tags
     * - Se o usuário NÃO possuir tags ou se tagsAnd e tagsOr são vazias, ele não é elegível
     * - Se o usuário possuir alguma tag dentro de tagsOr, ele é elegível
     * - Senão, se o usuário NÃO possuir TODAS as tags dentro tagsAnd, ele não é elegível
     * @typedef {string|{value: string}} Tag string | { value: string }
     * @param {Tag[]} tagsUser Tags do usuário
     * @param {Tag[]|undefined} tagsAnd  Tags que são obrigatórias (AND)
     * @param {Tag[]|undefined} tagsOr   Tags que são opcionais (OR)
     * @returns {boolean}
     */
    checkEligibilityTagsAnd (tagsUser, tagsAnd, tagsOr) {
        if (!tagsUser?.length || (!tagsAnd?.length && !tagsOr?.length)) return false;

        /**
         * @param {Tag} tag
         * @returns {string}
         */
        function parseTagValue (tag) {
            if (typeof tag === 'string') return tag.toLowerCase();
            if (!tag.value) throw new Error('Tag sem valor');
            return tag.value.toLowerCase();
        }

        const eligibilityUser = tagsUser.map((tag) => parseTagValue(tag));

        const eligibilityTagsOr = tagsOr?.map((tag) => parseTagValue(tag)) ?? [];

        const isEligibleByTagsOr = !!eligibilityTagsOr.length && eligibilityTagsOr.some((tag) => eligibilityUser.includes(tag));

        if (isEligibleByTagsOr) return true;

        const eligibilityTagsAnd = tagsAnd?.map((tag) => parseTagValue(tag)) ?? [];

        const isEligibleByTagsAnd = !!eligibilityTagsAnd.length && eligibilityTagsAnd.every((tag) => eligibilityUser.includes(tag));

        return isEligibleByTagsAnd;
    },

    filterAlura (filters, data) {
        const aluraFilters = ['completed', 'incompleted', 'uninitiated'];
        if (
            Object.keys(filters).length === 0 ||
            aluraFilters.every((key) => filters[key] !== 'true')
        ) {
            return data;
        }

        const results = [];
        if (filters.completed === 'true') {
            results.push(
                ...data.filter((section) => {
                    return section?.items.every((item) => {
                        return item?.tracking?.completion === 100;
                    });
                })
            );
        }
        if (filters.incompleted === 'true') {
            results.push(
                ...data.filter((section) => {
                    return section?.items.some((i) => {
                        return !!i?.tracking?.completion && i?.tracking?.completion < 100;
                    });
                })
            );
        }
        if (filters.uninitiated === 'true') {
            results.push(
                ...data.filter((section) => {
                    return section?.items.every((item) => {
                        return !item?.tracking;
                    });
                })
            );
        }

        return results;
    },

    mapAlura (results) {
        const data = [];

        results.forEach((result) => {
            const found = data.find((d) => d.title === result.section);
            if (!found) {
                data.push({
                    id: result.sectionId,
                    title: result.section,
                    trails: [
                        {
                            id: result.id,
                            title: result.title,
                            tracking: mapAluraTrackings(result.items),
                        },
                    ],
                    sectionType: 'alura',
                });
            } else {
                found.trails.push({
                    id: result.id,
                    title: result.title,
                    tracking: mapAluraTrackings(result.items),
                });
            }
        });

        return data;
    },

    getTrainingDataFromBody (body) {
        const { isTraining = false, certificateLayout, certificateDue, completedTrailsType = 'optional' } = body;

        if (!isTraining) return { isTraining, certificateLayout: null, certificateDue: null, completedTrailsType: null };

        let certificateDueObj = null;

        if (certificateDue) {
            const { type, value } = certificateDue;

            certificateDueObj = {
                type,
                value: type === 'availability' ? Number(value) : new Date(value),
            };
        }

        return {
            isTraining,
            certificateLayout: certificateLayout ?? null,
            certificateDue: certificateDueObj,
            completedTrailsType,
        };
    },

    getSectionTrailId,
    isSectionTrailInfo,
    isValidSectionTrailInfo,
    populateSectionTrails,
    setAssessmentHistoricOnSections,
};

function isNecessary (trail, tags) {
    const mandatoryTags = trail.mandatory;

    if (mandatoryTags.length === 0) {
        return false;
    }

    const hasMandatory = mandatoryTags.reduce((hasMandatory, tag) => {
        if (hasMandatory) {
            return true;
        }

        const filter = tags.filter((_tag) => _tag.value === tag.value);

        return filter.length > 0;
    }, false);

    if (!hasMandatory) {
        return false;
    }

    const items = trail.items;

    if (items.length === 0) {
        return false;
    }

    const hasMandatoryItems = items.reduce((hasMandatoryItems, item) => {
        if (hasMandatoryItems) {
            return true;
        }

        return item.mandatory ? item.mandatory : false;
    }, false);

    return hasMandatory && hasMandatoryItems;
}

function isCompleted (trail) {
    if (trail.completion === 1) {
        return true;
    } else {
        return false;
    }
}

function isIncomplete (trail) {
    if (trail.completion >= 0 && trail.completion < 1 && trail.completion !== null) {
        return true;
    } else {
        return false;
    }
}

function isHighlight (trail) {
    let flag = false;
    const today = getDateTodayWithoutHours();

    for (const item of trail.items) {
        if (item.itemID.highlighted) {
            const startDate = formatDateWithoutHours(item.itemID.startDate);
            const endDate = item.itemID.endDate
                ? formatDateWithoutHours(item.itemID.endDate)
                : 'Invalid Date';
            if (startDate <= today && (endDate >= today || endDate === 'Invalid Date')) flag = true;
        }
    }

    return flag;
}

function isNotStarted (trail) {
    if (trail.completion === null) {
        return true;
    } else {
        return false;
    }
}

function isMostRecent (trail) {
    const today = getDateTodayWithoutHours();
    const diffCreate = calculateDiffDate(today, formatDateWithoutHours(trail.createdAt), 'days');
    const diffUpdate = calculateDiffDate(today, formatDateWithoutHours(trail.updatedAt), 'days');

    if (diffCreate <= 30 || diffUpdate <= 30) {
        const today = getDateTodayWithoutHours();
        if (
            calculateDiffDate(trail.createdAt, today, 'days') <= 30 ||
            calculateDiffDate(trail.updatedAt, today, 'days') <= 30
        ) {
            return true;
        } else {
            return false;
        }
    }
}

function checkIfTheTrackIsValid (trail) {
    const today = getDateTodayWithoutHours();

    if (trail.classGroup) {
        const startGroup = formatDateWithoutHours(trail.classGroup.startDate);

        if (!(startGroup <= today)) {
            return false;
        }
    }

    if (trail.startDate && trail.endDate) {
        const startDate = formatDateWithoutHours(trail.startDate);
        const endDate = formatDateWithoutHours(trail.endDate);

        if (!(startDate <= today && endDate >= today)) {
            return false;
        }
    }
    return true;
}

function calculateDiffDateTrail (trail) {
    const today = getDateTodayWithoutHours();
    const diffCreate = calculateDiffDate(today, formatDateWithoutHours(trail.createdAt), 'days');
    const diffUpdate = calculateDiffDate(today, formatDateWithoutHours(trail.updatedAt), 'days');

    if (diffCreate <= 30 || diffUpdate <= 30) return true;
    return false;
}

function mapAluraTrackings (items) {
    if (items.every((item) => !item?.tracking)) {
        return null;
    }
    const mapCompletion = items.map((t) => t?.tracking?.completion || 0);
    const totalCompletion = mapCompletion?.reduce((acc, curr) => acc + curr, 0);

    return {
        email: items.find((item) => !!item?.tracking?.email)?.tracking?.email,
        completion: Number((totalCompletion / items?.length).toFixed(2)),
    };
}


function getClassStatus (classFromCourse, inClass) {
    try {
        const today = new Date()
        const courseHasSeats = classFromCourse.users.length < classFromCourse.limit || !classFromCourse.limit ? true : false
        const isCourseInProgress = classFromCourse.dateApplicationInitial <= today && classFromCourse.dateApplicationFinal >= today && courseHasSeats
        const isCourseOpen = classFromCourse.dateApplicationInitial >= today
        const isCourseClosed = classFromCourse.dateApplicationFinal <= today

        if (isCourseInProgress) {
            return "in-progress"
        }
        if (inClass) {
            return "registered"
        }
        if (isCourseClosed || !courseHasSeats) {
            return "closed"
        }
        if (isCourseOpen) {
            return "open"
        }

        return null
    } catch (error) {
        console.log(error);
        reject(error);
    }
}
