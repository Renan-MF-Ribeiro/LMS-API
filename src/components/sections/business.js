/* eslint-disable no-async-promise-executor */
const {
    formatDateWithoutHours,
    getDateTodayWithoutHours,
    calculateDiffDate,
    getTagsGroupsByToken,
    getUserByToken,
    getTagsGroups,
    isSCORMCompleted,
    slugify
} = require('../../utils/functions');
const { Group } = require('../groups/model');
const { CourseModel, WaitListModel, ClassModel, UsersWithProcessedTags } = require('../courses/model');
const { Tracking } = require('../tracking/model');
const { Section, DEFAULT_TYPES } = require('./model');
const { default: axios } = require('axios');
const moment = require('moment');
const { TrailViews } = require('../trails/trail-views.model');
const { populateTrails } = require('../trails/business');
const { listTrainingSectionsStatus, getAllHistoricsSectionsByUser } = require('../assessment/business');
const { Trail } = require('../trails/model');
const { cloneDeep } = require('lodash');
const { User } = require('../users/model');
const { getProcessedTags } = require('../users/business');
const RecommendedContent = require('../managers/schema/model');
const { ObjectId } = require('mongoose').Types

const isSectionTrailInfo = (trail) => (trail.type === 'trail' && ObjectId.isValid(trail._id)) || ObjectId.isValid(trail);

const isValidSectionTrailInfo = (trail) => !ObjectId.isValid(String(trail));

const getSectionTrailId = trail => ObjectId.isValid(trail) ? trail : (trail._id ?? null);

async function populateSectionTrails (sections, options) {
    const newSections = cloneDeep(sections);

    for await (const section of newSections) {
        if (!section?.trails?.length) continue;

        const trailsIds = section.trails
            .filter(trail => isSectionTrailInfo(trail))
            .map(trail => getSectionTrailId(trail));

        const query = Trail.find({ _id: { $in: trailsIds } });

        if (options?.select) query.select(options.select);

        const trails = await query.lean();

        const trailsMap = new Map(
            trails.map((trail) => [String(trail._id), trail])
        );

        section.trails = section.trails.map(trail => {
            if (isSectionTrailInfo(trail)) {
                const trailId = getSectionTrailId(trail);
                return trailsMap.get(String(trailId)) ?? trail;
            }

            return trail;
        });
    }

    return newSections;
}

async function setAssessmentHistoricOnSections (userId, sections) {
    const user = await User.findById(userId);
    const userTags = await getProcessedTags(user);

    const dataAssessmentHistoric = await listTrainingSectionsStatus(userId, userTags);

    return cloneDeep(sections).map(currentSection => {
        if (!currentSection.isTraining) return currentSection;

        const section = cloneDeep(currentSection);

        const trainingSectionInfo = dataAssessmentHistoric.find(info => String(info.trainingSectionId) === String(section._id))

        if (trainingSectionInfo) {
            const optionalTrails = trainingSectionInfo.optionalTrailsId ?? [];
            const isBlocked = trainingSectionInfo.isBlocked ?? false;
            const hasHistoric = trainingSectionInfo?.hasHistoric ?? false;
            const hasActiveCycle = trainingSectionInfo.hasActiveCycle ?? false;
            const hasWaitingCycle = trainingSectionInfo.hasWaitingCycle ?? false;
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

            const isCompleted = filteredTrails
                ?.filter(trail => {
                    const exceptionCertificateTrails = section?.exceptionCertificateTrails?.map(exceptionCertificateTrail => String(exceptionCertificateTrail));
                    return !exceptionCertificateTrails?.includes(String(trail._id));
                })
                ?.every(trail => trail.completion === 1);

            const messages = trainingSectionInfo.messages ?? [];

            if (!hasHistoric && section.displayType === 'hidden') {
                section.trails = section.trails.filter(trail => trail.isException || (trail.type && trail.type !== 'trail'));
            }

            section.hasAssessment = true;
            section.hasActiveCycle = hasActiveCycle;
            section.hasHistoric = hasHistoric;
            section.isBlocked = isBlocked;
            section.isCompleted = hasHistoric && isCompleted;
            section.hasCertificate = hasCertificate;
            section.optionalTrails = optionalTrails;
            section.cycleMessage = cycleMessage;
            section.cycleImage = cycleImage;
            section.cycleShowTrailResults = cycleShowTrailResults;
            section.exceptionTrainingTrails = exceptionTrainingTrails;
            section.messages = messages;
            section.hasWaitingCycle = hasWaitingCycle
        }
        else {
            const isCompleted = section.trails
                ?.filter(
                    (trail) => {
                        const includes = [
                            'default',
                            'assessment',
                            'separator',
                            'certificate',
                        ].includes(trail.type);
                        return !includes;
                    }
                )
                ?.filter(trail => {
                    const exceptionCertificateTrails = section?.exceptionCertificateTrails?.map(exceptionCertificateTrail => String(exceptionCertificateTrail));
                    return !exceptionCertificateTrails?.includes(String(trail._id));
                })
                ?.every((trail) => trail.completion === 1);

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

        if (section.isCompleted) {
            const sectionExceptions = section?.exceptionCertificateTrails || [];
            const trainingCertExceptions = trainingSectionInfo?.exceptionCertificateTrails || [];

            const allExceptions = [...sectionExceptions, ...trainingCertExceptions];

            section.duration = calculateTotalDuration(
                section.trails.filter(trail => trail.completion === 1 && !trail.isCertificateException),
                allExceptions,
            );
        }

        return section;
    });
}

async function setCerticateHistoricOnSections (user, sections) {

    const dataAssessmentHistoric = await getAllHistoricsSectionsByUser(user._id);

    const processedSections = cloneDeep(sections).map((currentSection) => {
        if (!currentSection.isTraining) return currentSection;

        const section = cloneDeep(currentSection);

        const trainingSectionInfo = dataAssessmentHistoric.find(info => String(info.trainingSectionId) === String(section._id))

        if (trainingSectionInfo) {
            const optionalTrails = trainingSectionInfo.optionalTrailsId ?? [];
            const isBlocked = trainingSectionInfo.isBlocked ?? false;
            const hasHistoric = trainingSectionInfo?.hasHistoric ?? false;
            const hasActiveCycle = trainingSectionInfo.hasActiveCycle ?? false;
            const hasWaitingCycle = trainingSectionInfo.hasWaitingCycle ?? false;
            const cycleMessage = trainingSectionInfo.cycleMessage ?? null;
            const cycleImage = trainingSectionInfo.cycleImage ?? null;
            const exceptionTrainingTrails = trainingSectionInfo.exceptionTrainingTrails ?? [];
            const hasCertificate = !!section.certificateLayout;
            const cycleShowTrailResults = trainingSectionInfo?.cycleShowTrailResults ?? true;
            const exceptionCertificateTrails = section?.exceptionCertificateTrails ?? [];

            const optionalTrailsStr = (optionalTrails || []).map(id => String(id));
            const exceptionTrainingTrailsStr = (exceptionTrainingTrails || []).map(id => String(id));
            const exceptionCertificateTrailsStr = (exceptionCertificateTrails || []).map(id => String(id));

            section.trails?.forEach(trail => {
                const trailIdStr = String(trail._id);

                if (optionalTrailsStr.includes(trailIdStr)) {
                    trail.isOptional = true;
                }

                if (exceptionTrainingTrailsStr.includes(trailIdStr)) {
                    trail.isException = true;
                }

                if (exceptionCertificateTrailsStr.includes(trailIdStr)) {
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

            const isCompleted = filteredTrails
                .filter(trail => trail.completion !== null)
                .every(trail => trail.completion === 1);

            const messages = trainingSectionInfo.messages ?? [];

            if (!hasHistoric && section.displayType === 'hidden') {
                section.trails = section.trails.filter(trail => trail.isException || (trail.type && trail.type !== 'trail'));
            }

            section.hasAssessment = true;
            section.hasActiveCycle = hasActiveCycle;
            section.hasHistoric = hasHistoric;
            section.isBlocked = isBlocked;
            section.isCompleted = hasHistoric && isCompleted;
            section.hasCertificate = hasCertificate;
            section.optionalTrails = optionalTrails;
            section.cycleMessage = cycleMessage;
            section.cycleImage = cycleImage;
            section.cycleShowTrailResults = cycleShowTrailResults;
            section.exceptionTrainingTrails = exceptionTrainingTrails;
            section.messages = messages;
            section.hasWaitingCycle = hasWaitingCycle
        }
        else {
            const isCompleted = section.trails
                ?.filter(
                    (trail) => {
                        const includes = [
                            'default',
                            'assessment',
                            'separator',
                            'certificate',
                        ].includes(trail.type);
                        return !includes;
                    }
                )
                ?.every((trail) => trail.completion === 1);

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

        if (section.isCompleted) {
            const sectionExceptions = section?.exceptionCertificateTrails || [];
            const trainingCertExceptions = trainingSectionInfo?.exceptionCertificateTrails || [];

            const allExceptions = [...sectionExceptions, ...trainingCertExceptions];

            section.duration = calculateTotalDuration(
                section.trails.filter(trail => trail.completion === 1 && !trail.isCertificateException),
                allExceptions
            );
        }

        return section;
    });



    return processedSections.filter(section =>
        section.hasCertificate && section.isCompleted
    );
}

async function processCourseInSections (elegibleCourses, userId) {
    const today = new Date();

    // Extract course IDs for batch queries
    const courseIds = elegibleCourses.map(course => course._id);

    // Batch query for wait list entries
    const waitListEntries = await WaitListModel.find({
        userID: userId,
        courseID: { $in: courseIds },
        sent: false,
    }).lean();

    // Create a Set for faster lookups
    const waitListCourseIds = new Set(waitListEntries.map(entry => entry.courseID.toString()));

    // Batch query for all classes from all courses
    const allClasses = await ClassModel.find({
        courseID: { $in: courseIds }
    })
        .populate({
            path: 'materials',
            match: { author: 'INSTRUTOR' },
        })
        .populate('instructor', ['name'])
        .sort({ createdAt: -1 })
        .lean();

    // Group classes by courseID for faster lookup
    const classesByCourse = new Map();
    allClasses.forEach(classItem => {
        const courseId = classItem.courseID.toString();
        if (!classesByCourse.has(courseId)) {
            classesByCourse.set(courseId, []);
        }
        classesByCourse.get(courseId).push(classItem);
    });

    // Match user in class function
    const matchUserInClass = (user) => String(user._id) === userId || user.userID?.equals?.(userId) || false;

    // Process courses
    const processedCourses = elegibleCourses.map((course) => {
        const courseIdStr = course._id.toString();
        const inWaitList = waitListCourseIds.has(courseIdStr);
        const classesFromCourse = classesByCourse.get(courseIdStr) || [];

        // Find the most recent class with presence data or the most recent class if none found
        const mostRecentClass = classesFromCourse.find(classItem => {
            const userInClass = classItem.users.find(matchUserInClass);

            const userPassedClass = userInClass?.presence && (userInClass.grades || 0) >= (course.passingScore || 0);

            return userPassedClass;
        }) || classesFromCourse[0] || null;

        const userInMostRecentClass = mostRecentClass?.users.find(matchUserInClass) ?? null;

        const presence = userInMostRecentClass?.presence || false;
        const completionAt = mostRecentClass?.dateApplicationFinal || null;
        const instructor = mostRecentClass?.instructor || null;
        const certificateElegible = userInMostRecentClass?.presence && (userInMostRecentClass?.grades || 0) >= (course.passingScore || 0);
        const certificateData = certificateElegible ? {
            completionAt: course.certificateDateType === 2
                ? mostRecentClass?.presenceAt : mostRecentClass?.dateApplicationFinal,
            qrcode: mostRecentClass?.qrcode || null,
            certificate: course.certificate || null,
            certificateLayout: course.certificateLayout || null,
            studentMaterials: mostRecentClass?.materials || null,
            workload: course.workload || null,
            instructor: mostRecentClass?.instructor || null,
            grade: userInMostRecentClass?.grades || null,
            status: certificateElegible
        } : null;

        // Process classes only if no certificate data
        const classes = certificateData ? [] : classesFromCourse
            .filter(classFromCourse => classFromCourse.dateApplicationFinal > today)
            .map((classFromCourse) => {
                const inClass = classFromCourse.users.some(matchUserInClass);

                return {
                    _id: classFromCourse._id,
                    name: classFromCourse.name,
                    registrationDeadline: classFromCourse.registrationDeadline,
                    cancellationDeadline: classFromCourse.cancellationDeadline,
                    dateApplicationInitial: classFromCourse.dateApplicationInitial,
                    dateApplicationFinal: classFromCourse.dateApplicationFinal,
                    location: classFromCourse.location,
                    status: getClassStatus(classFromCourse, inClass),
                };
            });

        return {
            ...course,
            certificateElegible: certificateData,
            inWaitList,
            classes,
            hasClasses: classes.length > 0,
            presence,
            completionAt,
            instructor,
        };
    });

    return processedCourses;
}

module.exports = {
    checkIfTheTrackIsValid (trail) {
        const today = getDateTodayWithoutHours();

        if (trail.classGroup) {
            const startGroup = formatDateWithoutHours(trail.classGroup.startDate);
            const limitGroup = formatDateWithoutHours(trail.classGroup.limitDate);

            if (!(startGroup <= today && limitGroup >= today)) {
                return false;
            }
        }

        // retorna caso não haja qualquer uma das datas
        if (!trail.startDate || !trail.endDate) {
            return true;
        }

        const startDate = moment(trail.startDate).startOf('day');
        const endDate = moment(trail.endDate).endOf('day');

        return moment().isBetween(startDate, endDate, null, '[]');
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
                        const currentDate = new Date();

                        if (
                            classGroup.status === 2 &&
                            new Date(classGroup.startDate) <= currentDate &&
                            new Date(classGroup.limitDate) >= currentDate
                        ) {
                            tags.push({
                                display: classGroup.groupCode,
                                value: classGroup.groupCode,
                            });
                        }
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
        const arrSections = [];

        const sections = await Section.find({
            deleted: 0,
            active: 1,
            default: false,
        }).lean();

        const trailsMap = new Map(
            trails.map((trail) => [String(trail._id), trail])
        );

        sections.forEach((section) => {
            const sectionTrails = section.trails
                .map(trail => {
                    const trailId = getSectionTrailId(trail);
                    return trailsMap.get(String(trailId)) ?? trail;
                })
                .filter(trail => trail && isValidSectionTrailInfo(trail) && checkIfTheTrackIsValid(trail))

            if (sectionTrails.length > 0) {
                arrSections.push({
                    ...section, trails: sectionTrails
                });
            };
        });

        return arrSections;
    },

    async mandatorySections (trails, tags) {
        const section = await Section.findOne({
            defaultType: DEFAULT_TYPES.MANDATORY,
            active: 1,
        }).lean();

        if (!section) return [];

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
        return trails.length > 0 ? section : [];
    },

    async recentsSections (trails) {

        const section = await Section.findOne({
            defaultType: DEFAULT_TYPES.RECENTS,
            active: 1,
        }).lean();

        if (!section) return [];

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

        return section.trails.length > 0 ? section : []
    },

    async keepLearningSections (trails) {
        const section = await Section.findOne({
            defaultType: DEFAULT_TYPES.KEEP_LEARNING,
            active: 1,
        }).lean();

        if (!section) return [];

        const sortFnc =
            section && section.ordination !== undefined && section.ordination === 0
                ? function (a, b) {
                    return b.createdAt - a.createdAt;
                }
                : function (a, b) {
                    return a.title.localeCompare(b.title);
                };

        for (const trail of trails) {
            if (trail.completion === 0 ?? !trail.completion) {
                section.trails.push(trail);
            }
        }

        section.trails.sort(sortFnc);
        return section.trails.length > 0 ? section : [];
    },

    async favoriteSections (trails, userId) {
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

        if (!section) return [];

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
        return section.trails.length > 0 ? section : []
    },

    async concludedSections (trails) {
        const section = await Section.findOne({
            defaultType: DEFAULT_TYPES.CONCLUDED,
            active: 1,
        }).lean();

        if (!section) return [];

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
        return section.trails.length > 0 ? section : [];
    },

    async courseInSections (tags, userId) {
        const section = await Section.findOne({
            defaultType: DEFAULT_TYPES.COURSES,
            active: 1,
        }).lean();

        if (!section) return [];

        const currentDateISO = new Date().toISOString();

        // Get eligible courses
        const elegibleCourses = await CourseModel.find({
            tags: { $in: tags },
            deleted: { $eq: 0 },
            status: { $eq: 1 },
            dateFinal: { $gte: currentDateISO }
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
                certificateDateType: 1,
            })
            .lean();

        if (!elegibleCourses.length) {
            return [];
        }

        const processedCourses = await processCourseInSections(elegibleCourses, userId);

        // Sort function
        const sortFnc = section?.ordination === 0
            ? () => -1
            : (a, b) => a.title?.localeCompare(b.title) || 0;

        // Add courses to section and sort
        section.trails = processedCourses.sort(sortFnc);

        return section.trails.length > 0 ? section : [];
    },

    async mostSeenSections (trails) {

        const section = await Section.findOne({
            defaultType: DEFAULT_TYPES.MOST_SEEN,
            active: 1,
        }).lean();

        if (!section) return [];

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
            const completion = trails.find(t => t._id.toString() === trail._id.toString())?.completion || null;
            return {
                ...trail,
                count,
                completion,
                confidential: trail.confidential ?? false
            };
        })
        return trails.length > 0 ? section : [];
    },
    async recommendedTrailsSections (trails, userId) {
        const [section, recommendations] = await Promise.all([
            Section.findOne({
                defaultType: DEFAULT_TYPES.RECOMMENDED_TRAILS,
                active: 1,
            }).lean(),
            RecommendedContent.findOne({ userId })
        ]);

        if (!section || !recommendations || recommendations?.length === 0) {
            return [];
        }

        for (const trail of trails) {
            const isRecommended = recommendations?.recommendedTrails?.some((recommendedTrail) => recommendedTrail?.id?.toString() === trail?._id?.toString());
            if (isRecommended) {
                section.trails?.push(trail);
            }
        }

        return section;
    },

    async recommendedCoursesSections (userId) {
        const [section, recommendations] = await Promise.all([
            Section.findOne({
                defaultType: DEFAULT_TYPES.RECOMMENDED_COURSES,
                active: 1,
            }).lean(),
            RecommendedContent.findOne({ userId })
        ]);
        if (!section || !recommendations || recommendations?.length === 0) {
            return [];
        }

        let elegibleCourses = await CourseModel.find({
            _id: { $in: recommendations?.recommendedCourses?.map((rc) => rc.courseId) }
        })
            .lean();

        if (!elegibleCourses.length) {
            return [];
        }

        const processedCourses = await processCourseInSections(elegibleCourses, userId);

        // Sort function
        const sortFnc = section?.ordination === 0
            ? () => -1
            : (a, b) => a.title?.localeCompare(b.title) || 0;

        // Add courses to section and sort
        section.trails = processedCourses.sort(sortFnc);

        return section.trails.length > 0 ? section : [];
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

    async getContentEligibilityParameterByUserId (userId) {
        const user = await User.findOne({ _id: userId }).lean();
        const groups = user.groupsAD;
        const namesGroups = groups.filter(group => group.includes('ELEGE'));
        const tagsTemp = await Promise.all(namesGroups.map(async name => {
            const group = await Group.findOne({ name });
            return group ? group.tags : [];
        }));
        const tags = tagsTemp.flat()

        user.classGroups?.forEach(classGroup => {
            tags.push({
                display: classGroup.groupCode,
                value: classGroup.groupCode,
            });
        });

        user.tags?.forEach(tag => {
            const diff = calculateDiffDate(
                today,
                formatDateWithoutHours(tag.createdAt),
                'days'
            );
            if (diff <= 30) {
                delete tag.createdAt;
                tags.push(tag);
            }
        });

        const classGroups = [];
        user.classGroups.forEach(classGroup => {
            tags.forEach(tag => {
                if (classGroup.groupCode === tag.value) {
                    classGroups.push(classGroup);
                }
            });
        });

        return {
            user,
            tags,
            classGroups
        }
    },

    canRegisterOrCancel,
    getSectionTrailId,
    isSectionTrailInfo,
    isValidSectionTrailInfo,
    populateSectionTrails,
    setAssessmentHistoricOnSections,
    setCerticateHistoricOnSections,
    retrieveUserContent,
    getBannersFromContent,
    processCourseInSections
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

function canRegisterOrCancel (initialDate, minutes) {
    if (!minutes) return true;
    const currentDate = new Date()
    currentDate.setMinutes(currentDate.getMinutes() - 180);

    const deadline = new Date(initialDate);
    deadline.setMinutes(deadline.getMinutes() - minutes);

    return deadline >= currentDate;
}

function getClassStatus (classFromCourse, inClass) {
    try {
        const { dateApplicationInitial, dateApplicationFinal, registrationDeadline, cancellationDeadline } = classFromCourse;
        const today = new Date()
        const courseHasSeats = classFromCourse.users.length < classFromCourse.limit || !classFromCourse.limit ? true : false
        const isCourseInProgress = dateApplicationInitial <= today && dateApplicationFinal >= today && courseHasSeats
        const isCourseOpen = dateApplicationInitial >= today
        const isCourseClosed = dateApplicationFinal <= today

        const canRegister = canRegisterOrCancel(dateApplicationInitial, registrationDeadline)
        const canCancel = canRegisterOrCancel(dateApplicationInitial, cancellationDeadline)

        if (isCourseInProgress) {
            return "in-progress"
        }

        if (inClass) {
            return "registered"
        }

        if (isCourseClosed || !courseHasSeats || !canRegister || !canCancel) {
            return "closed"
        }

        if (isCourseOpen && (canRegister || canCancel)) {
            return "open";
        }

        return null
    } catch (error) {
        console.log(error);
        reject(error);
    }

}

function calculateTotalDuration (trails, exceptionIds = []) {
    const exceptionIdStrings = exceptionIds.map(String);

    return trails.reduce((total, trail) => {
        if (!trail || typeof trail !== 'object' || ['default', 'assessment', 'separator', 'certificate'].includes(trail.type)) {
            return total;
        }

        const trailId = String(trail._id);
        const isException = exceptionIdStrings.includes(trailId);
        if (isException) return total;

        const itemsDuration = trail.items?.reduce((sum, item) => {
            const duration = item?.itemID?.durationHours || 0;
            return sum + duration;
        }, 0) || 0;

        return total + itemsDuration;
    }, 0);
}

async function retrieveUserContent (tags, user, trailsIdArr) {


    let resultSections = [];

    if (tags.length > 0) {
        const query = {
            enabled: true,
            $or: [{ tags: { $in: tags, } }, { tagsAnd: { $in: tags, } }]
        };

        if (trailsIdArr?.length > 0) {
            query['_id'] = { $in: trailsIdArr };
        }
        let trails = await populateTrails(true, query);

        trails = trails.filter(checkIfTheTrackIsValid);

        resultSections = (await module.exports.elegiblesContents(trails))
            .concat(await module.exports.mandatorySections(trails, tags))
            .concat(await module.exports.recentsSections(trails))
            .concat(await module.exports.keepLearningSections(trails))
            .concat(await module.exports.concludedSections(trails))
            .concat(await module.exports.favoriteSections(trails, user._id))
            .concat(await module.exports.mostSeenSections(trails))
            .concat(await module.exports.courseInSections(tags, user._id));

        resultSections = resultSections.filter((val) => {
            return val != null;
        });

        if (resultSections.length > 0) {
            resultSections.sort((a, b) => (a.position < b.position ? -1 : 1));
        }



    }

    return resultSections;
}

function getBannersFromContent (sections) {
    const banners = [];
    sections.forEach((section) => {
        if (!section._id) return;
        if (section.sectionType === 'alura') {
            return;
        }

        if (section.defaultType === 'courses') {
            section.trails.forEach((courseItem) => {
                if (courseItem?.highlighted) {
                    const sectionParam = slugify(section.title ?? '');
                    const trailParam = slugify(courseItem?.title ?? '');
                    const bannerItem = {
                        path: courseItem.banner,
                        link: process.env.DOMAIN,
                        queryParams: { section: sectionParam, trail: trailParam },
                        internal: true
                    };

                    const isBannerNotDuplicate = banners.every(
                        (b) => b.path !== bannerItem.path
                    );

                    if (
                        courseItem?.highlighted &&
                        moment(courseItem.startDate).isSameOrBefore(moment()) &&
                        moment(courseItem.endDate).isSameOrAfter(moment()) &&
                        isBannerNotDuplicate
                    ) {
                        banners.push(bannerItem);
                    }
                }
            });
            return;
        }


        section.trails?.forEach((trailItem) => {
            if (trailItem?.items?.length) {
                trailItem.items.forEach((i) => {
                    const item = i.itemID;
                    if (item?.bannerPath) {
                        const bannerItem = {
                            path: item.bannerPath,
                            link: `app/player/${trailItem._id}/${item._id}`,
                            internal: true
                        };

                        const isBannerNotDuplicate = banners.every(
                            (b) => b.path !== bannerItem.path
                        );

                        if (
                            item.highlighted &&
                            moment(item.startDate).isSameOrBefore(moment()) &&
                            moment(item.endDate).isSameOrAfter(moment()) &&
                            isBannerNotDuplicate

                        ) {
                            banners.push(bannerItem);
                        }
                    }
                });
            }
        });
    });

    return banners;
}

