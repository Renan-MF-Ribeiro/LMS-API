/* eslint-disable no-async-promise-executor */
const { Tracking } = require('../tracking/model');
const { Trail } = require('../trails/model');
const { populateTrails } = require('../trails/business');
const { checkItemCompleted } = require('../sections/business');
const { AverageCourses, AverageRating } = require('../logs/model');
const {
    getUserByToken,
    calculateAverage,
    processTrailTracking,
    isValidDate,
} = require('../../utils/functions');
const {
    getTrailCompletion,
    getTagsElegiblesByToken,
    getTagsElegibles,
    checkIfTheTrackIsValid,
} = require('../sections/business');
const { getCoursesByUserID } = require('../courses/business');

module.exports = {
    trailsCompletedOrInProgress(req) {
        return new Promise(async (resolve, reject) => {
            try {
                const user = await getUserByToken(req);
                const arrTrails = [];
                const arrTrailsCompletedOrProgress = [];
                const allTrackingUser = await Tracking.find({
                    userLogin: { $eq: user.networkLogin },
                    $or: [
                        { expiredCompletion: { $exists: false } },
                        { expiredCompletion: { $eq: null } },
                    ],
                });

                for (const t of allTrackingUser) {
                    const trails = await Trail.find({
                        'items.itemID': { $in: t.item },
                    });

                    for (const trail of trails) {
                        // if (t.completion === 1 || isSCORMCompleted(t.lessonStatus)) arrTrails.push(trail._id.toString())
                        arrTrails.push(trail._id.toString());
                    }
                }

                const newArrTrails = [...new Set(arrTrails)];

                for (const p in newArrTrails) {
                    const trailFilter = await populateTrails(true, {
                        _id: { $eq: newArrTrails[p] },
                    });
                    let trail = trailFilter[0];

                    if (trail) {
                        const processedTrail = processTrailTracking(trail, allTrackingUser);
                        trail = processedTrail.trail;
                        if (processedTrail.containsACompletedItem) {
                            arrTrailsCompletedOrProgress.push(trail);
                        }
                    }
                }

                resolve({
                    trailsCompleted: arrTrailsCompletedOrProgress,
                });
            } catch (error) {
                reject(error);
            }
        });
    },

    trailsCompletedExpired(req) {
        return new Promise(async (resolve, reject) => {
            try {
                const user = await getUserByToken(req);
                const arrTrails = [];
                const arrTrailsCompletedOrProgress = [];
                const trackings = await Tracking.find({
                    userLogin: user.networkLogin,
                    $and: [
                        { expiredCompletion: { $exists: true } },
                        { expiredCompletion: { $ne: null } },
                    ],
                });

                for (const t of trackings) {
                    const trails = await Trail.find({
                        'items.itemID': { $in: t.item },
                    });

                    for (const trail of trails) {
                        arrTrails.push(trail._id.toString());
                    }
                }

                const newArrTrails = [...new Set(arrTrails)];

                for (const p in newArrTrails) {
                    const trailFilter = await populateTrails(true, {
                        _id: { $eq: newArrTrails[p] },
                    });
                    let trail = trailFilter[0];

                    if (trail) {
                        const processedTrail = processTrailTracking(trail, trackings);
                        trail = processedTrail.trail;
                        if (
                            processedTrail.containsACompletedItem &&
                            isValidDate(trail.completionAt)
                        ) {
                            arrTrailsCompletedOrProgress.push(trail);
                        }
                    }
                }

                resolve({
                    trailsCompleted: arrTrailsCompletedOrProgress,
                });
            } catch (error) {
                reject(error);
            }
        });
    },

    calculateAverageStudent(user) {
        return new Promise(async (resolve, reject) => {
            try {
                const result = await calculateAverage(user);
                const average = (result.total * 100) / result.max;
                resolve(average || 0);
            } catch (error) {
                reject(error);
            }
        });
    },

    studentAverageCourses(user, req) {
        return new Promise(async (resolve, reject) => {
            try {
                const { numberTrailsCompleted, numberTrailsElegibles } =
                    await numberOfCompleteAndEligibleCourses(user, true, req);
                const averageStudentCourses =
                    numberTrailsElegibles > 0
                        ? (numberTrailsCompleted * 100) / numberTrailsElegibles
                        : 0;
                resolve({
                    averageStudentCourses,
                    numberTrailsCompleted,
                    numberTrailsElegibles,
                });
            } catch (error) {
                reject(error);
            }
        });
    },

    averageGroupCourses(user, group) {
        return new Promise(async (resolve, reject) => {
            try {
                const data = user[group];
                const averageGroupACourses = await AverageCourses.findOne({
                    'store.group': group,
                    'item.tag': data,
                });
                resolve(averageGroupACourses ? averageGroupACourses.average : 0);
            } catch (error) {
                reject(error);
            }
        });
    },

    averageGroupRatings(user, group) {
        return new Promise(async (resolve, reject) => {
            try {
                const data = user[group];
                const averageGroupACourses = await AverageRating.findOne({
                    'store.group': group,
                    'item.tag': data,
                });
                resolve(averageGroupACourses ? averageGroupACourses.average : 0);
            } catch (error) {
                reject(error);
            }
        });
    },

    getNumberOfItemsCompletedOrInProgressOrNotStarted(req) {
        return new Promise(async (resolve, reject) => {
            try {
                const user = await getUserByToken(req);
                const tags = await getTagsElegiblesByToken(req);
                const arrTrails = [];
                const arrItemsID = [];

                let numberOfItemsNotStarted = 0;
                let numberOfItemsCompleted = 0;
                let numberOfItemsInProgress = 0;

                // let numberOfItemsMandatoryNotStarted = 0
                // let numberOfItemsMandatoryCompleted = 0
                // let numberOfItemsMandatoryInProgress = 0

                // const trails = await Trail.find({
                //     // enabled: true,
                //     tags: { $in: tags },
                // }).populate('items')

                const trails = await populateTrails(
                    true,
                    { tags: { $in: tags }, enabled: true },
                    false
                );

                for (const trail of trails) {
                    if (checkIfTheTrackIsValid(trail)) arrTrails.push(trail);
                }

                for (const trail of arrTrails) {
                    for (const item of trail.items) {
                        if (arrItemsID.indexOf(item.itemID._id.toString()) < 0) {
                            const completion = await checkItemCompleted(item, user);
                            if (completion === null) {
                                numberOfItemsNotStarted++;
                            }
                            if (completion === 1) {
                                numberOfItemsCompleted++;
                            }

                            if (completion !== null && completion >= 0 && completion < 1) {
                                numberOfItemsInProgress++;
                            }
                        }

                        arrItemsID.push(item.itemID._id.toString());
                    }
                }
                const {
                    numberOfItemsMandatoryNotStarted,
                    numberOfItemsMandatoryCompleted,
                    numberOfItemsMandatoryInProgress,
                } = await calculateNumberOfMandatoryItems(arrTrails, user, tags);

                resolve({
                    numberOfItemsNotStarted,
                    numberOfItemsCompleted,
                    numberOfItemsInProgress,
                    numberOfItemsMandatoryNotStarted,
                    numberOfItemsMandatoryCompleted,
                    numberOfItemsMandatoryInProgress,
                });
            } catch (error) {
                reject(error);
            }
        });
    },
    getStudentCourses(req) {
        return new Promise(async (resolve, reject) => {
            try {
                const user = await getUserByToken(req);

                const courses = await getCoursesByUserID(user._id.toString());

                resolve(courses);
            } catch (error) {
                reject(error);
            }
        });
    },

    returnCertificates(trails, user) {
        return new Promise(async (resolve, reject) => {
            try {
                const certs = [];
                const itemsID = [];
                for (const trail of trails) {
                    for (const item of trail.items) {
                        if (
                            item.completion === 1 &&
                            item.itemID.certificate === 1 &&
                            itemsID.indexOf(item.itemID.id) < 0
                        ) {
                            const tracking = await Tracking.findOne({
                                $text: { $search: user.networkLogin },
                                item: item.itemID._id,
                            }).sort({ createdAt: -1 });
                            item.itemID.completionAt = tracking.completionAt;

                            const concludedAt = tracking.completionAt;
                            const { completion } = item;
                            const { durationHours, title, thumbPath } = item.itemID;
                            certs.push({
                                duration: durationHours,
                                concludedAt,
                                title,
                                userName: user.name,
                                thumbPath,
                                completion,
                                score: tracking.score,
                                type: 'item',
                                itemId: item.itemID.id,
                                certificateLayout: item.itemID.certificateLayout,
                            });
                            itemsID.push(item.itemID.id);
                        }
                    }
                    var mostRecentDate = new Date(
                        Math.max.apply(
                            null,
                            trail.items.map((e) => {
                                return new Date(e.itemID.completionAt);
                            })
                        )
                    );

                    if (trail && trail.completion === 1) {
                        let duration = 0;
                        for (const item of trail.items) {
                            duration += item.itemID.durationHours;
                        }
                        const { title, thumbPath, completion } = trail;
                        certs.push({
                            duration,
                            title,
                            concludedAt: mostRecentDate,
                            userName: user.name,
                            thumbPath,
                            completion,
                            scoreAverage: trail.scoreAverage,
                            type: 'trail',
                            trailId: trail._id,
                            certificateLayout: trail.certificateLayout,
                            certificateDue: trail?.certificateDue,
                        });
                    }
                }
                resolve(certs);
            } catch (error) {
                reject(error);
            }
        });
    },
};

function numberOfCompleteAndEligibleCourses(user, flagToken, req) {
    return new Promise(async (resolve, reject) => {
        try {
            const tags = flagToken
                ? await getTagsElegiblesByToken(req)
                : await getTagsElegibles(user);

            const trails = await populateTrails(
                true,
                { tags: { $in: tags }, enabled: true },
                false
            );
            // const trails = await Trail.find({
            //     // enabled: true,
            //     tags: { $in: tags },
            // }).populate('items')

            let numberTrailsCompleted = 0;
            let numberTrailsElegibles = 0;

            for (const trail of trails) {
                if (checkIfTheTrackIsValid(trail)) numberTrailsElegibles += 1;

                for (const item of trail.items) {
                    const completion = await checkItemCompleted(item, user);
                    item.completion = completion;
                }

                trail.completion = getTrailCompletion(trail);
                if (getTrailCompletion(trail) === 1) numberTrailsCompleted += 1;
            }

            resolve({
                numberTrailsCompleted,
                numberTrailsElegibles,
            });
        } catch (error) {
            reject(error);
        }
    });
}

// function checkIfItemIsMandatory (trail, item, userTags) {
//     if (!item.mandatory) {
//         return false
//     }

//     const trailMandatoryTags = trail.mandatory
//     const hasMandatory = mandatoryTags.reduce((hasMandatory, tag) => {
//         if (hasMandatory) {
//             return true
//         }

//         const filter = userTags.filter(_tag => _tag.value == tag.value)

//         return filter.length > 0
//     }, false)
// }

function calculateNumberOfMandatoryItems(trails, user, userTags) {
    return new Promise(async (resolve, reject) => {
        try {
            // Filtra todas as trilhas mandatórias para o usuário.
            const mandatoryTrails = trails
                .filter((trail) => {
                    const trailMandatoryTags = trail.mandatory;
                    const hasMandatory = trailMandatoryTags.reduce((hasMandatory, tag) => {
                        if (hasMandatory) {
                            return true;
                        }
                        const filter = userTags.filter((_tag) => _tag.value === tag.value);

                        return filter.length > 0;
                    }, false);

                    if (hasMandatory) {
                        return trail;
                    }
                })
                .filter((trail) => {
                    return trail.items.reduce((hasMandatoryItems, item) => {
                        if (hasMandatoryItems) {
                            return true;
                        }

                        if (item.mandatory) {
                            return true;
                        }
                    }, false);
                });

            // Pega todos os items das trilhas mandatórias.
            const mandatoryItems = [
                ...new Set(
                    mandatoryTrails
                        .map((trail) => {
                            return trail.items;
                        })
                        .flat()
                        .filter((item) => {
                            return item.mandatory === true;
                        })
                ),
            ];

            // console.log(mandatoryItems)
            // Itera sobre os itens mandatórios.

            const statistics = {
                numberOfItemsMandatoryNotStarted: 0,
                numberOfItemsMandatoryCompleted: 0,
                numberOfItemsMandatoryInProgress: 0,
            };

            for (const item of mandatoryItems) {
                const completion = await checkItemCompleted(item, user);

                if (completion == null) {
                    statistics.numberOfItemsMandatoryNotStarted++;
                }

                if (completion === 1) {
                    statistics.numberOfItemsMandatoryCompleted++;
                }

                if (completion !== null && completion >= 0 && completion < 1) {
                    statistics.numberOfItemsMandatoryInProgress++;
                }
            }
            resolve(statistics);
        } catch (error) {
            reject(error);
        }
    });
}
