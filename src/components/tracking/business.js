const {
    DocumentTracking,
    MediaTracking,
    AudioTracking,
    SCORMTracking,
    ExamTracking,
    SCORMLessonStatus,
    EventTracking,
    FormTracking,
    ActivityTracking,
    PostTracking,
    Tracking,
} = require('./model');

const axios = require('axios');
const TRACKING_KINDS = Object.freeze({
    DocumentTracking: DocumentTracking,
    MediaTracking: MediaTracking,
    SCORMTracking: SCORMTracking,
    ExamTracking: ExamTracking,
    AudioTracking: AudioTracking,
    EventTracking: EventTracking,
    FormTracking: FormTracking,
    ActivityTracking: ActivityTracking,
    PostTracking: PostTracking,
});

const { HistoricEvaluation } = require('../assessments/model');
const { Trail } = require('../trails/model');
const { processTrailTracking } = require('../../utils/functions');
const { User } = require('../users/model');
const { EVENT_CATEGORY } = require('../gamification/model');

module.exports = {
    async createCompleteTracking(item, trackingType, networkLogin) {
        const _tracking = {
            item: item._id,
            userLogin: networkLogin,
            createdAt: new Date(),
            updatedAt: new Date(),
            completionAt: new Date(),
            lastState: '{}',
            sessionTime: 0,
            totalTime: 0,
        };
        let trackingToSave = {};
        if (
            trackingType === 'SCORMTracking' ||
            trackingType === 'ExamTracking' ||
            trackingType === 'ActivityTracking'
        ) {
            trackingToSave = {
                ..._tracking,
                score: 0,
                completion: 1,
                lessonStatus: 'passed',
            };
        } else {
            trackingToSave = {
                ..._tracking,
                completion: 1,
            };
        }
        const TrackingModel = TRACKING_KINDS[trackingType];
        await TrackingModel.updateOne({ item: item._id, userLogin: networkLogin }, trackingToSave, {
            upsert: true,
            omitUndefined: true,
        });
    },

    async processExamTracking(historic, passingScore, attempts, tracking) {
        const result = {
            remainingAttempts: 0,
            lessonStatus: SCORMLessonStatus.INCOMPLETE,
            completionAt: null,
            score: null,
        };
        const score = parseFloat(
            ((historic.amountQuestionsCorrect * 100) / historic.amountOfQuestions).toFixed(2)
        );
        const passed = score >= passingScore;

        result.score = score || 0;

        if (passed) {
            result.lessonStatus = SCORMLessonStatus.PASSED;
            await HistoricEvaluation.findByIdAndUpdate(historic._id, {
                lessonStatus: SCORMLessonStatus.PASSED,
            });
        } else {
            if (attempts && tracking.remainingAttempts) {
                result.remainingAttempts = tracking.remainingAttempts - 1;
                result.lessonStatus = result.remainingAttempts
                    ? SCORMLessonStatus.INCOMPLETE
                    : SCORMLessonStatus.FAILED;
            } else if (!attempts) {
                result.lessonStatus = SCORMLessonStatus.INCOMPLETE;
            } else {
                result.lessonStatus = SCORMLessonStatus.FAILED;
            }

            await HistoricEvaluation.findByIdAndUpdate(historic._id, {
                lessonStatus: SCORMLessonStatus.FAILED,
            });
        }
        if (
            result.lessonStatus == SCORMLessonStatus.PASSED ||
            result.lessonStatus == SCORMLessonStatus.FAILED
        ) {
            result.completionAt = new Date();
        }
        await ExamTracking.findByIdAndUpdate(tracking._id, { ...result });
        return result;
    },

    async updateProgressAluraItem(items) {
        const host = process.env.API_ALURA;
        const clientId = process.env.CLIENT_ID;
        const headers = { 'x-client-key': process.env.API_KEY_ALURA };
        const body = items
            .map((item) => {
                if (item.itemID.kind === 'AluraItem')
                    return {
                        itemId: null,
                        aluraId: item.itemID.id,
                    };
            })
            .filter((item) => item !== undefined);
        try {
            const uri = `${host}/trackings/update/${clientId}`;
            await axios.post(uri, body, { headers });
        } catch (error) {
            console.log(error);
        }
    },

    async getCompletedTrails(userLogin) {
        const trailsWithTracking = [];
        const processedTrailsWithTracking = [];
        let allItems = 0;
        let data;

        const allTrackingUser = await Tracking.find({
            userLogin: { $eq: userLogin },
            kind: { $ne: 'PostTracking' },
            $or: [{ expiredCompletion: { $exists: false } }, { expiredCompletion: { $eq: null } }],
        });

        const query = {
            'items.itemID': {
                $in: allTrackingUser.map((v) => v.item),
            },
        };

        const trails = await Trail.find(query).populate({
            path: 'items',
            populate: {
                path: 'itemID',
                model: 'Item',
            },
        });

        for (const trail of trails) {
            const processedTrail = processTrailTracking(trail, allTrackingUser);
            trailsWithTracking.push(processedTrail);
        }

        for (const v of trailsWithTracking) {
            const trail = v.trail;
            trail.items = v.trail.items.filter(
                (i) =>
                    i.itemID.enabled &&
                    !i.itemID.archive &&
                    i.itemID.enabled &&
                    i.itemID.kind !== 'PostItem'
            );
            const completedTrails = [];
            allItems = trail.items.length;
            let itemData;
            const itemDataArr = [];

            for (const item in trail.items) {
                if (trail.items[item].itemID?.completion == 1) {
                    completedTrails.push(trail.items[item]);
                }
                trail.items[item] = trail.items[item].itemID;
                itemData = {
                    completion: trail.items[item]?.completion === 1,
                    completionAt: trail.items[item]?.completionAt,
                    kind: trail.items[item]?.kind,
                    _id: trail.items[item]?._id,
                    score: trail.items[item]?.score,
                    createdAt: trail.items[item]?.createdAt,
                    updatedAt: trail.items[item]?.updatedAt,
                    title: trail.items[item]?.title,
                };
                itemDataArr.push(itemData);
            }

            const completed = completedTrails.length == allItems;
            if (trail.certificate === 1 && completed) {
                const userFind = await User.findOne({ networkLogin: userLogin });
                certificate = {
                    clientId: process.env.CLIENT_ID,
                    completionDate: trail.completionAt,
                    courseLoad: trail.items.reduce((accumulator, currentValue) => {
                        return accumulator + (currentValue.durationHours || 0);
                    }, 0),
                    userName: userFind.name,
                    userId: userLogin,
                    expirationDate: trail.expirationDate,
                    certificateDue: trail.certificateDue,
                    workload: trail.scoreAverage,
                    layoutId: trail.certificateLayout,
                    trailId: trail._id,
                    trailName: trail.title,
                    itemId: trail.itemId,
                    itemName: trail.title,
                };
            }

            data = {
                title: trail.title,
                concludedAt: trail.completionAt,
                completion: (100 * completedTrails.length) / allItems,
                type: 'Online',
            };
            processedTrailsWithTracking.push(data);
        }
        return processedTrailsWithTracking.filter((v) => v.completion >= 100);
    },

    async getLastConclusionByUser(userLogin) {
        return Tracking.findOne(
            {
                userLogin: userLogin,
            },
            'completionAt'
        ).sort({ completionAt: -1 });
    },

    async getFilteredTrackingEvents({
        trackingItem,
        TrackingModel,
        reqBody,
        completionAt,
        userLogin,
        itemId,
        isNewTracking,
    }) {
        const eventsToDispatch = [];

        const isItemCompleted =
            completionAt !== null ||
            (TrackingModel === SCORMTracking &&
                ['completed', 'passed'].includes(reqBody.lessonStatus)) ||
            reqBody.completion === 1;

        const trail = await Trail.findOne({ 'items.itemID': itemId });

        if (trail) {
            if (isNewTracking) {
                const existingTrackingsCount = await Tracking.countDocuments({
                    item: { $in: trail.items.map((i) => i.itemID), $ne: itemId },
                    userLogin: userLogin,
                    $or: [
                        { expiredCompletion: { $exists: false } },
                        { expiredCompletion: { $eq: null } },
                    ],
                });

                if (existingTrackingsCount === 0) {
                    eventsToDispatch.push(EVENT_CATEGORY.STARTED_TRAIL);
                }
            }

            if (isItemCompleted) {
                eventsToDispatch.push(
                    EVENT_CATEGORY.FINISHED_ITEM,
                    EVENT_CATEGORY.FINISHED_FAVORITE_TRAIL,
                    EVENT_CATEGORY.FINISHED_OPTIONAL_TRAIL,
                    EVENT_CATEGORY.FINISHED_SECTION,
                    EVENT_CATEGORY.FINISHED_SHARED_TRAIL,
                    EVENT_CATEGORY.FINISHED_TRAIL,
                    EVENT_CATEGORY.ACHIEVED_PROGRESS_PERCENTAGE
                );

                if (trackingItem?.highlighted) {
                    eventsToDispatch.push(EVENT_CATEGORY.FINISHED_HIGHLIGHTED_ITEM);
                }

                const currentItem = trail.items.find(
                    (item) => item.itemID.toString() === itemId.toString()
                );

                if (currentItem?.optional) {
                    eventsToDispatch.push(EVENT_CATEGORY.FINISHED_OPTIONAL_ITEM);
                }

                if (trackingItem?.collaborative && (reqBody.completion > 0 || reqBody.lessonStatus)) {
                    eventsToDispatch.push(EVENT_CATEGORY.WATCHED_COLLAB);
                }
            }
        }

        return eventsToDispatch;
    }
};
