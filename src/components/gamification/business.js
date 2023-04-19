const axios = require('axios');
const { processTrailTracking } = require('../../utils/functions');
const { Item } = require('../items/model');
const {
    getTrailCompletion,
    getTagsElegibles,
} = require('../sections/business');
const { Tracking } = require('../tracking/model');
const { populateTrails } = require('../trails/business');
const { EVENTS_CATEGORY } = require('./model');

const GamificationBusiness = {
    async handleEvent(user, category, props) {
        const uri = `${process.env.API_GAMIFICATION}/event-users`;
        const networkLogin = user.networkLogin;
        const tags = await getTagsElegibles(user);
        const eligibilities = tags.map(({ value }) => value);

        try {
            await axios.post(
                uri,
                {
                    clientId: +process.env.CLIENT_ID,
                    networkLogin,
                    category,
                    eligibilities,
                    props,
                },
                {
                    headers: {
                        'x-api-key': process.env.API_KEY_GAMIFICATION,
                    },
                }
            );
        } catch (err) {
            const errorInfo = 'GAMIFICATION_DISPATCH_EXCEPTION';
            if (err?.code) {
                const { errno, code, syscall, address } = err;
                throw {
                    errorInfo,
                    errno,
                    code,
                    syscall,
                    address,
                };
            } else if (err?.response?.data) {
                const { title, ...props } = err.response.data;
                throw { errorInfo, title, ...props };
            }
        }
    },

    // ❌ NOT TO DO
    async [EVENTS_CATEGORY.LIKE](user, category) {
        await GamificationBusiness.handleEvent(user, category);
    },

    // ❌ NOT TO DO
    async [EVENTS_CATEGORY.COMMENT](user, category) {
        await GamificationBusiness.handleEvent(user, category);
    },

    // ❌ NOT TO DO
    async [EVENTS_CATEGORY.RECOMMEND](user, category) {
        await GamificationBusiness.handleEvent(user, category);
    },

    // ✅ DONE
    async [EVENTS_CATEGORY.LOGIN](user, category) {
        await GamificationBusiness.handleEvent(user, category);
    },

    // 🕐 TO DO
    async [EVENTS_CATEGORY.OPENED_FROM_EMAIL](user, category) {
        await GamificationBusiness.handleEvent(user, category);
    },

    // 🕐 TO DO
    async [EVENTS_CATEGORY.OPENED_FROM_NOTIFICATION](user, category) {
        await GamificationBusiness.handleEvent(user, category);
    },

    // 🕐 TO DO
    async [EVENTS_CATEGORY.EVALUATED_CONTENT](user, category) {
        await GamificationBusiness.handleEvent(user, category);
    },

    // ✅ DONE
    async [EVENTS_CATEGORY.FINISHED_TRAIL](user, category, props) {
        const { item, completion = null, lessonStatus = null } = props;
        const trails = await populateTrails(true, {
            'items.itemID': { $in: [item] },
        });

        const allTrackingUser = await Tracking.find({
            userLogin: user.networkLogin,
            $or: [
                { expiredCompletion: { $exists: false } },
                { expiredCompletion: { $eq: null } },
            ],
        });

        for (const trail of trails) {
            const processedTrail = processTrailTracking(trail, allTrackingUser);
            const isAboutToComplete = {
                ...processedTrail.trail,
                items: processedTrail.trail.items.map((i) => {
                    return i.itemID._id.equals(item)
                        ? {
                              ...i,
                              completion: !lessonStatus
                                  ? completion
                                  : lessonStatus === 'passed'
                                  ? 1
                                  : 0,
                          }
                        : i;
                }),
            };

            const foundItem = processedTrail.trail.items.find((i) => {
                return i.itemID._id.equals(item);
            });

            if (
                !!foundItem &&
                foundItem.completion !== 1 &&
                getTrailCompletion(isAboutToComplete) === 1
            ) {
                await GamificationBusiness.handleEvent(user, category, {
                    trail,
                    item,
                    completion,
                    userCreatedAt: user.createdAt,
                });
            }
        }
    },

    // ✅ DONE
    async [EVENTS_CATEGORY.STARTED_TRAIL](user, category, props) {
        const { item } = props;
        const trails = await populateTrails(true, {
            'items.itemID': { $in: [item] },
        });
        const allTrackingUser = await Tracking.find({
            userLogin: user.networkLogin,
            $or: [
                { expiredCompletion: { $exists: false } },
                { expiredCompletion: { $eq: null } },
            ],
        });

        for (const trail of trails) {
            const processedTrail = processTrailTracking(trail, allTrackingUser);
            if (getTrailCompletion(processedTrail.trail) === null) {
                await GamificationBusiness.handleEvent(user, category, {
                    trail,
                    item,
                });
            }
        }
    },

    // ✅ DONE
    async [EVENTS_CATEGORY.FINISHED_ITEM](user, category, props) {
        const { item, completion = null, lessonStatus = null } = props;
        const tracking = await Tracking.findOne({
            item,
            userLogin: user.networkLogin,
            $or: [
                { expiredCompletion: { $exists: false } },
                { expiredCompletion: { $eq: null } },
            ],
        });
        const validTracking = !tracking || !tracking?.completionAt;
        const validCompletion = completion === 1;
        const validLesson = ['passed', 'completed'].includes(lessonStatus);
        const validResult = validCompletion || validLesson;

        if (validTracking && validResult) {
            await GamificationBusiness.handleEvent(user, category);
        }
    },

    // ✅ DONE
    async [EVENTS_CATEGORY.UPLOADED_CONTENT](user, category) {
        const collabItems = await Item.find({
            author: user._id,
            collaborative: true,
            enabled: true,
        });
        const collabItemsCreatedAt = collabItems.map((c) => c.createdAt);

        await GamificationBusiness.handleEvent(user, category, {
            collabItemsCreatedAt,
        });
    },

    // 🕐 TO DO
    async [EVENTS_CATEGORY.SHARED_CONTENT](user, category) {
        await GamificationBusiness.handleEvent(user, category);
    },

    // ✅ DONE
    async [EVENTS_CATEGORY.WATCHED_COLLAB](user, category, props) {
        const { item, completion } = props;
        const collabItem = await Item.findOne({
            _id: item,
            collaborative: true,
        });

        if (collabItem) {
            const tracking = await Tracking.findOne({
                item: collabItem._id,
                userLogin: user.networkLogin,
                $or: [
                    { expiredCompletion: { $exists: false } },
                    { expiredCompletion: { $eq: null } },
                ],
            });

            const validTracking = !tracking || !tracking?.completionAt;
            const validCompletion = completion === 1;

            if (validTracking && validCompletion) {
                const trails = await populateTrails(true, {
                    'items.itemID': { $in: [item] },
                });

                const allTrackingUser = await Tracking.find({
                    userLogin: user.networkLogin,
                    $or: [
                        { expiredCompletion: { $exists: false } },
                        { expiredCompletion: { $eq: null } },
                    ],
                });

                for (const trail of trails) {
                    const processedTrail = processTrailTracking(
                        trail,
                        allTrackingUser
                    );
                    await GamificationBusiness.handleEvent(user, category, {
                        trail: processedTrail.trail,
                    });
                }
            }
        }
    },
};

module.exports = GamificationBusiness;
