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
const { CourseModel, WaitListModel } = require('../courses/model');
const { Tracking } = require('../tracking/model');
const { Section, DEFAULT_TYPES } = require('./model');

module.exports = {
    checkIfTheTrackIsValid(trail) {
        const today = getDateTodayWithoutHours();

        if (trail.classGroup) {
            const startGroup = formatDateWithoutHours(
                trail.classGroup.startDate
            );

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

    calculateDiffDateTrail(trail) {
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

    checkIfUserCanSeeTheTrail(trail, userTags) {
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
    getTrailCompletion(trail) {
        const completed = trail.items.find((val) => {
            return val.completion === 1;
        });
        const incomplete = trail.items.find((val) => {
            return (
                val.completion != null &&
                val.completion >= 0 &&
                val.completion < 1
            );
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
    filterTrails(filter, trails, elegibleTags) {
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
            if (
                completed ||
                incompleted ||
                necessary ||
                highlighted ||
                mostRecent ||
                notStarted
            ) {
                filteredTrails.push(trails[i]);
            }
        }
        return filteredTrails;
    },
    setTrailMandatory(trail, tags) {
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
                if (user.assessmentGroups.length > 0) {
                    const assessmentGroups = await Group.find({ name: { $in: user.assessmentGroups } });
                    const assessmentGroupsTags = assessmentGroups.flatMap(({ tags }) => tags);
                    tags.push(...assessmentGroupsTags)
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

    getGroupCodesByToken(req, tags) {
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

    getTagsElegibles(user) {
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

    checkItemCompleted(item, user) {
        return new Promise(async (resolve, reject) => {
            try {
                let completion = null;

                const tracking = await Tracking.findOne({
                    item: { $eq: item.itemID._id },
                    userLogin: { $eq: user.networkLogin },
                });

                if (tracking) {
                    if (
                        tracking.kind === 'SCORMTracking' ||
                        tracking.kind === 'ExamTracking'
                    ) {
                        if (
                            tracking.lessonStatus === 'FAILED' ||
                            tracking.lessonStatus === 'failed'
                        ) {
                            completion = 2;
                        } else {
                            completion = isSCORMCompleted(tracking.lessonStatus)
                                ? 1
                                : 0;
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

    async elegiblesContents(trails) {
        return new Promise(async (resolve, reject) => {
            try {
                const arrSections = [];
                const sections = await Section.find({
                    deleted: 0,
                    active: 1,
                    default: false,
                }).lean();

                const validTrails = trails.filter((t) =>
                    checkIfTheTrackIsValid(t)
                );

                sections.forEach((section) => {
                    const sortedSections = section.trails.map((t) => String(t));
                    const filteredSectionTrails = section.trails
                        .filter((trailId) =>
                            validTrails
                                .map((t) => String(t._id))
                                .includes(String(trailId))
                        )
                        .map((f) => String(f));

                    section.trails = validTrails
                        .filter((validTrail) =>
                            filteredSectionTrails.includes(
                                String(validTrail._id)
                            )
                        )
                        .sort((a, b) => {
                            return (
                                sortedSections.indexOf(String(a._id)) -
                                sortedSections.indexOf(String(b._id))
                            );
                        });

                    if (section.trails.length > 0) {
                        arrSections.push(section);
                    }
                });

                resolve(arrSections);
            } catch (error) {
                reject(error);
            }
        });
    },

    async mandatorySections(trails, tags) {
        return new Promise(async (resolve, reject) => {
            try {
                const section = await Section.findOne({
                    defaultType: DEFAULT_TYPES.MANDATORY,
                    active: 1,
                }).lean();

                if (section) {
                    const sortFnc =
                        section &&
                        section.ordination !== undefined &&
                        section.ordination === 0
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
                                if (
                                    trail.mandatory[m].value === tags[t].value
                                ) {
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

    async recentsSections(trails) {
        return new Promise(async (resolve, reject) => {
            try {
                const section = await Section.findOne({
                    defaultType: DEFAULT_TYPES.RECENTS,
                    active: 1,
                }).lean();

                if (section) {
                    const sortFnc =
                        section &&
                        section.ordination !== undefined &&
                        section.ordination === 0
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

    async assessmentSections(trails) {

    },

    async keepLearningSections(trails) {
        return new Promise(async (resolve, reject) => {
            try {
                const section = await Section.findOne({
                    defaultType: DEFAULT_TYPES.KEEP_LEARNING,
                    active: 1,
                }).lean();

                if (section) {
                    const sortFnc =
                        section &&
                        section.ordination !== undefined &&
                        section.ordination === 0
                            ? function (a, b) {
                                  return b.createdAt - a.createdAt;
                              }
                            : function (a, b) {
                                  return a.title.localeCompare(b.title);
                              };

                    for (const trail of trails) {
                        if (trail.completion === 0) {
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

    async concludedSections(trails) {
        return new Promise(async (resolve, reject) => {
            try {
                const section = await Section.findOne({
                    defaultType: DEFAULT_TYPES.CONCLUDED,
                    active: 1,
                }).lean();

                if (section) {
                    const sortFnc =
                        section &&
                        section.ordination !== undefined &&
                        section.ordination === 0
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

    async courseInSections (tags, courses, userId) {
        return new Promise(async (resolve, reject) => {
            try {
                const section = await Section.findOne({
                    defaultType: DEFAULT_TYPES.COURSES,
                    active: 1,
                }).lean();
                let elegibleCourses = await CourseModel.find({ tags: { $in: tags }, deleted: { $eq: 0 }, status: { $eq: 1 } }).select({
                    title: 1,
                    thumbPath: 1,
                    _id: 1,
                    description: 1,
                    passingScore: 1,
                    certificate: 1,
                    certificateLayout: 1,
                    workload: 1,
                    instructor: 1,
                }).lean()

                for (let i of elegibleCourses) {
                    const alreadyJoined = await WaitListModel.findOne({
                        userID: userId,
                        courseID: i._id,
                        sent: false
                    });
                    let inWaitList = false
                    if (alreadyJoined) {
                        inWaitList = true
                    }
                    courses.map((e) => {
                        if (String(e.courseID._id) == String(i._id)) {
                            const presence = e.users[0].presence
                            const grade = e.users[0].grades ?  e.users[0].grades : 0
                            const passingScore = i.passingScore ?  i.passingScore: 0
                            const certificateElegible = grade >= passingScore ? true : false
                            i.certificateElegible = certificateElegible
                            i.presence = presence
                            i.grade = grade
                            i.completionAt = e.dateApplicationFinal
                            i.studentMaterials = e.materials
                            i.instructor = e.instructor
                        }
                    })
                    i.inWaitList = inWaitList
                }

                if (section) {
                    const sortFnc =
                        section &&
                            section.ordination !== undefined &&
                            section.ordination === 0
                            ? function (a, b) {
                                return -1
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


    checkEligibilityTagsAnd(tagsUser, tagsAnd, tagsOr) {
        const eligibilityUser = tagsUser.map((tag) =>
            tag.value.toLocaleLowerCase()
        );

        const eligibilitytagsAnd = eligibilityUser.some((eligibility) =>
            tagsAnd?.some((m) => m.value.toLocaleLowerCase() === eligibility)
        );

        if (eligibilitytagsAnd) {
            const allEligibilitytagsAnd = tagsAnd?.every((eligibility) =>
                eligibilityUser.includes(eligibility.value.toLocaleLowerCase())
            );

            if (allEligibilitytagsAnd) {
                return true;
            }
        } else {
            const eligibilityTag = eligibilityUser.some((eligibility) =>
                tagsOr?.some(
                    (tag) => tag.value.toLocaleLowerCase() === eligibility
                )
            );
            if (eligibilityTag) {
                return true;
            }
        }
        return false;
    },
};

function isNecessary(trail, tags) {
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

function isCompleted(trail) {
    if (trail.completion === 1) {
        return true;
    } else {
        return false;
    }
}

function isIncomplete(trail) {
    if (
        trail.completion >= 0 &&
        trail.completion < 1 &&
        trail.completion !== null
    ) {
        return true;
    } else {
        return false;
    }
}

function isHighlight(trail) {
    let flag = false;
    const today = getDateTodayWithoutHours();

    for (const item of trail.items) {
        if (item.itemID.highlighted) {
            const startDate = formatDateWithoutHours(item.itemID.startDate);
            const endDate = item.itemID.endDate
                ? formatDateWithoutHours(item.itemID.endDate)
                : 'Invalid Date';
            if (
                startDate <= today &&
                (endDate >= today || endDate === 'Invalid Date')
            )
                flag = true;
        }
    }

    return flag;
}

function isNotStarted(trail) {
    if (trail.completion === null) {
        return true;
    } else {
        return false;
    }
}

function isMostRecent(trail) {
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

function checkIfTheTrackIsValid(trail) {
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

function calculateDiffDateTrail(trail) {
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
}