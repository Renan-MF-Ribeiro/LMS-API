const axios = require('axios');
const { getSortedDate } = require('../../../utils/functions');
const { Item } = require('../../items/model');
const { Tracking } = require('../../tracking/model');
const { populateTrails } = require('../../trails/business');
const { EVENT_CATEGORY } = require('../model');
const moment = require('moment');
const { socialApi } = require('../../social/http-adapter');
const { User } = require('../../users/model');
const {
    handleUserEligibilitiesGamification,
    getTrailsAndUserTrackingsGamification,
    isValidCompletedTrailGamification,
    isValidCompletedItemGamification,
    getPercentageCompletedTrailsGamification,
} = require('../utils');
const { Trail } = require('../../trails/model');
const { Section } = require('../../sections/model');
const { Types } = require('mongoose');

const GamificationEventBusiness = {
    async *validate(category, user, meta) {
        switch (category) {
            case EVENT_CATEGORY.ACHIEVED_PROGRESS_PERCENTAGE: {
                yield* handleAchievedProgressPercentage({ user, meta });
                break;
            }
            case EVENT_CATEGORY.FINISHED_FAVORITE_TRAIL: {
                yield* handleFinishedFavoriteTrail({ user, meta });
                break;
            }
            case EVENT_CATEGORY.FINISHED_HIGHLIGHTED_ITEM: {
                yield* handleFinishedHighlightedItem({ meta });
                break;
            }
            case EVENT_CATEGORY.FINISHED_ITEM: {
                yield* handleFinishedItem({ meta });
                break;
            }
            case EVENT_CATEGORY.FINISHED_OPTIONAL_ITEM: {
                yield* handleFinishedOptionalItem({ meta });
                break;
            }
            case EVENT_CATEGORY.FINISHED_SECTION: {
                yield* handleFinishedSection({ user, meta });
                break;
            }
            case EVENT_CATEGORY.FINISHED_SHARED_TRAIL: {
                yield* handleFinishedSharedTrail({ user, meta });
                break;
            }
            case EVENT_CATEGORY.FINISHED_TRAIL: {
                yield* handleFinishedTrail({ user, meta });
                break;
            }
            case EVENT_CATEGORY.OPTIONAL_SURVEY: {
                yield* handleOptionalSurvey({ meta });
                break;
            }
            case EVENT_CATEGORY.STARTED_TRAIL: {
                yield* handleStartedTrail({ user, meta });
                break;
            }
            case EVENT_CATEGORY.UPLOADED_CONTENT: {
                yield* handleUploadedContent({ user });
                break;
            }
            case EVENT_CATEGORY.WATCHED_COLLAB: {
                yield* handleWatchedCollab({ user, meta });
                break;
            }
            default: {
                yield { validated: true };
                break;
            }
        }
    },
};

async function* handleAchievedProgressPercentage({ user, meta }) {
    const { tracking } = meta;

    const { trails, allTrackingUser } = await getTrailsAndUserTrackingsGamification(user, tracking);

    const foundCompletedTrail = trails.find((trail) => {
        return isValidCompletedTrailGamification(trail, allTrackingUser);
    });

    let achievedValue = 0;

    if (!!foundCompletedTrail) {
        achievedValue = await getPercentageCompletedTrailsGamification(user);
    }

    yield {
        validated: !!foundCompletedTrail,
        achievedValue,
        meta: {
            trailId: foundCompletedTrail?._id,
            trailTitle: foundCompletedTrail?.title,
            trailThumbPath: foundCompletedTrail?.thumbPath,
        },
    };
}

async function* handleFinishedFavoriteTrail({ user, meta }) {
    const { tracking } = meta;

    const { trails, allTrackingUser } = await getTrailsAndUserTrackingsGamification(user, tracking);

    const uri = `home/favorite/${user._id}`;
    const { data: favoriteTrails } = await socialApi.get(uri);

    for (const trail of trails) {
        const isFavorite = favoriteTrails.some((favorite) => trail._id.equals(favorite.trailId));

        const isValidCompleted = isValidCompletedTrailGamification(trail, allTrackingUser);

        yield {
            validated: isFavorite && isValidCompleted,
            meta: {
                trail,
                userCreatedAt: user.createdAt,
            },
        };
    }
}

async function* handleFinishedHighlightedItem({ meta }) {
    const { tracking } = meta;

    const item = await Item.findById(tracking.item);

    const isValidCompleted = isValidCompletedItemGamification(tracking);

    yield {
        validated: item.highlighted && isValidCompleted,
    };
}

async function* handleFinishedItem({ meta }) {
    const { tracking } = meta;

    const isValidCompleted = isValidCompletedItemGamification(tracking);

    yield {
        validated: isValidCompleted,
    };
}

async function* handleFinishedOptionalItem({ meta }) {
    const { tracking } = meta;

    const trails = await Trail.find({ enabled: true, 'items.itemID': tracking.item });

    for (const trail of trails) {
        const isValidCompleted = isValidCompletedItemGamification(tracking);

        const isOptional = trail.items.some((i) => i.itemID.equals(tracking.item) && i.optional);

        yield {
            validated: isValidCompleted && isOptional,
        };
    }
}

async function* handleFinishedSection({ user, meta }) {
    const { tracking } = meta;

    const { trails, allTrackingUser } = await getTrailsAndUserTrackingsGamification(user, tracking);

    const sections = await Section.find({
        trails: { $in: trails.map((trail) => trail._id) },
        active: 1,
    });

    for (const section of sections) {
        const sectionTrails = section.trails.filter((sectionTrail) => {
            return trails.find((trail) => trail._id.equals(sectionTrail))?.enabled;
        });

        const isSectionCompleted = sectionTrails.every((trailId) => {
            const foundTrail = trails.find((trail) => trail._id.equals(trailId));

            return isValidCompletedTrailGamification(foundTrail, allTrackingUser);
        });

        yield {
            validated: sectionTrails?.length > 0 && isSectionCompleted,
            meta: {
                sectionId: section._id,
                sectionTitle: section.title,
            },
        };
    }
}

async function* handleFinishedSharedTrail({ user, meta }) {
    const { tracking } = meta;

    const { trails, allTrackingUser } = await getTrailsAndUserTrackingsGamification(user, tracking);

    for (const trail of trails) {
        const isValidCompleted = isValidCompletedTrailGamification(trail, allTrackingUser);

        const payload = {
            validated: isValidCompleted,
            meta: {
                trail,
                userCreatedAt: user.createdAt,
            },
        };

        if (isValidCompleted) {
            const uri = `home/share/${process.env.CLIENT_ID}/${trail._id}`;
            const { data } = await socialApi.get(uri);

            const sharedBy = data.filter(({ userId }) => !user._id.equals(userId));
            const usersWhoShared = await User.find({
                networkLogin: {
                    $in: sharedBy.map((whoShared) => whoShared.userName),
                },
            });

            for (const whoShared of usersWhoShared) {
                const eligibilities = await handleUserEligibilitiesGamification(whoShared.groupsAD);

                yield {
                    ...payload,
                    networkLogin: whoShared.networkLogin,
                    category: EVENT_CATEGORY.FINISHED_SHARED_TRAIL,
                    eligibilities,
                };
            }
        }

        yield payload;
    }
}

async function* handleFinishedTrail({ user, meta }) {
    const { tracking } = meta;

    const { trails, allTrackingUser } = await getTrailsAndUserTrackingsGamification(user, tracking);

    for (const trail of trails) {
        const isValidCompleted = isValidCompletedTrailGamification(trail, allTrackingUser);

        let beforeLimitDate;

        if (['fixed', 'availability'].includes(trail?.expirationType?.type || '')) {
            const value = trail.expirationType.value;
            const isFixed = trail.expirationType.type === 'fixed';
            const trailStartDate = moment(trail.startDate);

            const userCreatedAfter = moment(user.createdAt).endOf('day').diff(trailStartDate) >= 0;
            const startDate = moment(userCreatedAfter ? user.createdAt : trailStartDate);

            beforeLimitDate = !isFixed ? startDate.add(value, 'days').toDate() : new Date(value);
        }

        const itemsCompletionAt = trail.items.map((i) => new Date(i.completionAt));
        const startDate = getSortedDate(itemsCompletionAt, 'asc');
        const endDate = getSortedDate(itemsCompletionAt, 'desc');

        const lastDate = getSortedDate(itemsCompletionAt, 'desc');
        const releaseDate = trail.startDate;

        yield {
            validated: isValidCompleted,
            beforeLimitDate,
            startDate,
            endDate,
            lastDate,
            releaseDate,
            issuer: trail._id,
            meta: {
                trailId: trail._id,
                trailTitle: trail.title,
                trailThumbPath: trail.thumbPath,
            },
        };
    }
}

async function* handleOptionalSurvey({ meta }) {
    const { itemId, survey } = meta;

    const item = await Item.findById(itemId)

    yield {
        validated: item?.survey === 'optional' && survey?.concluded,
        issuer: item._id,
        meta: {
            itemId: item._id,
            itemTitle: item.title,
        }
    }
}

async function* handleStartedTrail({ user, meta }) {
    const { tracking } = meta;

    const trails = await populateTrails(true, {
        enabled: true,
        'items.itemID': tracking.item,
    });

    const allTrackingUser = await Tracking.find({
        userLogin: user.networkLogin,
        item: { $in: trails.flatMap((trail) => trail.items.map((item) => item.itemID)) },
        $or: [{ expiredCompletion: { $exists: false } }, { expiredCompletion: { $eq: null } }],
    });

    for (const trail of trails) {
        const trackings = allTrackingUser
            .filter((tracking) => trail.items.some((item) => item.itemID.equals(tracking.item)))
            .sort((prev, curr) => prev.createdAt.getTime() - curr.createdAt.getTime());

        const hasOne = trackings?.length === 1;
        const createdAt = moment(trackings?.[0]?.createdAt);
        const updatedAt = moment(tracking?.updatedAt);
        const isValidTracking = createdAt.isSame(updatedAt);
        const isSameDay = updatedAt.isSame(moment(trail.startDate), 'day');

        yield {
            validated: hasOne && isValidTracking && isSameDay,
            meta: {
                trailId: trail._id,
                trailTitle: trail.title,
                trailThumbPath: trail.thumbPath,
            },
        };
    }
}

async function* handleUploadedContent({ user }) {
    const collabItems = await Item.find({
        author: user._id,
        collaborative: true,
        enabled: true,
    });
    const collabItemsCreatedAt = collabItems.map((c) => c.createdAt);

    yield {
        validated: collabItems?.length > 0,
        startDate: getSortedDate(collabItemsCreatedAt, 'asc'),
        endDate: getSortedDate(collabItemsCreatedAt, 'desc'),
    };
}

async function* handleWatchedCollab({ user, meta }) {
    const { tracking } = meta;
    const collabItem = await Item.findOne({
        _id: tracking.item,
        collaborative: true,
    });

    const isCompleted = tracking?.completion === 1;
    const completionAt = moment(tracking?.completionAt);
    const updatedAt = moment(tracking?.updatedAt);

    const { trails } = await getTrailsAndUserTrackingsGamification(user, tracking);

    for (const trail of trails) {
        yield {
            validated: collabItem && isCompleted && completionAt.isSame(updatedAt),
            sameDayRelease: trail?.startDate,
        };
    }
}

module.exports = GamificationEventBusiness;
