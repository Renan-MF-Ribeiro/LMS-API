const { getSortedDate, processTrailTracking } = require('../../../utils/functions');
const { Item } = require('../../items/model');
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
    getProcessedTrailsGamification,
} = require('../utils');
const { Trail } = require('../../trails/model');
const { Section } = require('../../sections/model');
const { COMMENT_STATUS } = require('../../social/model');
const AssessmentBusiness = require('../../assessment/business');
const { Tracking, SCORMLessonStatus } = require('../../tracking/model');
const { populateTrails } = require('../../trails/business');
const { Types } = require('mongoose');
const { HistoricEvaluation } = require('../../assessments/model');

const GamificationEventBusiness = {
    async *validate(category, user, meta) {
        switch (category) {
            case EVENT_CATEGORY.ACHIEVED_PROGRESS_PERCENTAGE: {
                yield* handleAchievedProgressPercentage({ user, meta });
                break;
            }
            case EVENT_CATEGORY.COMMENT: {
                yield* handleComment({ meta });
                break;
            }
            case EVENT_CATEGORY.FEED_COMMENT: {
                yield* handleFeedComment({ meta });
                break;
            }
            case EVENT_CATEGORY.FEED_COMMENT_OWNER: {
                yield* handleFeedCommentOwner({ user, meta });
                break;
            }
            case EVENT_CATEGORY.FEED_GROUP_CREATE: {
                yield* handleFeedGroupCreate({ user, meta });
                break;
            }
            case EVENT_CATEGORY.FEED_GROUP_JOIN: {
                yield* handleFeedGroupJoin({ meta });
                break;
            }
            case EVENT_CATEGORY.FEED_GROUP_PARTICIPANT: {
                yield* handleFeedGroupParticipant({ user, meta });
                break;
            }
            case EVENT_CATEGORY.FEED_LIKE: {
                yield* handleFeedLike({ user, meta });
                break;
            }
            case EVENT_CATEGORY.FEED_LIKE_OWNER: {
                yield* handleFeedLikeOwner({ user, meta });
                break;
            }
            case EVENT_CATEGORY.FEED_SHARE: {
                yield* handleFeedShare({ user, meta });
                break;
            }
            case EVENT_CATEGORY.FEED_SHARE_OWNER: {
                yield* handleFeedShareOwner({ user, meta });
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
            case EVENT_CATEGORY.FINISHED_EXAM_ITEM: {
                yield* handleFinishedExamItem({ user, meta });
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
            case EVENT_CATEGORY.FINISHED_OPTIONAL_TRAIL: {
                yield* handleFinishedOptionalTrail({ user, meta });
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
            case EVENT_CATEGORY.SHARE:
            case EVENT_CATEGORY.LIKE: {
                yield* handleGetTrailMeta({ meta });
                break;
            }
            case EVENT_CATEGORY.OPTIONAL_SURVEY: {
                yield* handleOptionalSurvey({ meta });
                break;
            }
            case EVENT_CATEGORY.SHARED_CONTENT: {
                yield* handleSharedContent({ user, meta });
                break;
            }
            case EVENT_CATEGORY.STARTED_TRAIL: {
                yield* handleStartedTrail({ user, meta });
                break;
            }
            case EVENT_CATEGORY.SURVEY: {
                yield* handleSurvey({ user, meta });
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

    const processedTrails = await getProcessedTrailsGamification(user, tracking);

    const foundCompletedTrail = processedTrails.find((processedTrail) => {
        return isValidCompletedTrailGamification(processedTrail);
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

async function* handleComment({ meta }) {
    const { trailId, commentId } = meta;

    const { data: comment } = await socialApi.get('comments', { params: { commentId } });

    const trail = await Trail.findById(trailId);

    yield {
        validated: comment.status === COMMENT_STATUS.APPROVED,
        issuer: trailId,
        meta: {
            trailId,
            trailTitle: trail.title,
            trailThumbPath: trail.thumbPath,
        },
    };
}

async function* handleFeedComment({ meta }) {
    const { postId, comment } = meta;

    const uri = `posts/${postId}`;
    const { data } = await socialApi.get(uri);

    yield {
        validated: data?.status === 'ACTIVE',
        issuer: postId,
        meta: {
            postId,
            post: data?.post,
            comment,
        },
    };
}

async function* handleFeedCommentOwner({ user, meta }) {
    const { postId, comment } = meta;

    const uri = `posts/${postId}`;
    const { data } = await socialApi.get(uri);

    const owner = await User.findById(data?.userId);

    yield {
        validated: data?.status === 'ACTIVE',
        networkLogin: owner?.networkLogin,
        issuer: user._id,
        meta: {
            postId,
            post: data?.post,
            comment,
        },
    };
}

async function* handleFeedGroupCreate({ user, meta }) {
    const { groupId } = meta;

    const uri = `groups/info/${groupId}`;
    const { data } = await socialApi.get(uri);

    yield {
        validated: user._id.equals(data?.ownerId),
        meta: {
            groupId,
            groupName: data.groupName,
        },
    };
}

async function* handleFeedGroupJoin({ meta }) {
    const { groupId } = meta;

    const uri = `groups/info/${groupId}`;
    const { data } = await socialApi.get(uri);

    yield {
        validated: true,
        meta: {
            groupId,
            groupName: data.groupName,
        },
    };
}

async function* handleFeedGroupParticipant({ user, meta }) {
    const { groupId } = meta;

    const uri = `groups/info/${groupId}`;
    const { data } = await socialApi.get(uri);

    const owner = await User.findById(data?.ownerId);

    yield {
        validated: data?.status === 'ACTIVE',
        networkLogin: owner?.networkLogin,
        issuer: user.id,
        meta: {
            groupId,
            groupName: data.groupName,
        },
    };
}

async function* handleFeedLike({ user, meta }) {
    const { postId } = meta;

    const uri = `posts/${postId}`;
    const { data } = await socialApi.get(uri);

    yield {
        validated: data?.status === 'ACTIVE' && data?.userId && !user._id.equals(data.userId),
        issuer: postId,
        meta: {
            postId,
            post: data?.post,
        },
    };
}

async function* handleFeedLikeOwner({ user, meta }) {
    const { postId } = meta;

    const uri = `posts/${postId}`;
    const { data } = await socialApi.get(uri);

    const owner = await User.findById(data?.userId);

    yield {
        validated: data?.status === 'ACTIVE' && data?.userId && !user._id.equals(data.userId),
        networkLogin: owner?.networkLogin,
        issuer: user._id,
        meta: {
            postId,
            post: data?.post,
        },
    };
}

async function* handleFeedShare({ user, meta }) {
    const { postId, usersWhoShared } = meta;

    const uri = `posts/${postId}`;
    const { data } = await socialApi.get(uri);

    yield {
        validated: data?.status === 'ACTIVE' && data?.userId && !user._id.equals(data.userId),
        issuer: postId,
        meta: {
            postId,
            post: data?.post,
            usersWhoShared,
        },
    };
}

async function* handleFeedShareOwner({ user, meta }) {
    const { postId, usersWhoShared } = meta;

    const uri = `posts/${postId}`;
    const { data } = await socialApi.get(uri);

    const owner = await User.findById(data?.userId);

    yield {
        validated:
            data?.status === 'ACTIVE' &&
            data?.userId &&
            !user._id.equals(data.userId) &&
            !usersWhoShared.some(
                (userWhoShared) => owner._id.equals(userWhoShared) || user._id.equals(userWhoShared)
            ),
        networkLogin: owner?.networkLogin,
        issuer: user._id,
        meta: {
            postId,
            post: data?.post,
            usersWhoShared,
        },
    };
}

async function* handleFinishedFavoriteTrail({ user, meta }) {
    const { tracking } = meta;

    const processedTrails = await getProcessedTrailsGamification(user, tracking);

    const uri = `home/favorite/${user._id}`;
    const { data: favoriteTrails } = await socialApi.get(uri);

    for (const processedTrail of processedTrails) {
        const isFavorite = favoriteTrails.some((favorite) =>
            processedTrail?._id.equals(favorite.trailId)
        );

        const isValidCompleted = isValidCompletedTrailGamification(processedTrail);

        yield {
            validated: isFavorite && isValidCompleted,
            meta: {
                trailId: processedTrail?._id,
                trailTitle: processedTrail?.title,
                trailThumbPath: processedTrail?.thumbPath,
            },
        };
    }
}

async function* handleFinishedHighlightedItem({ meta }) {
    const { tracking } = meta;

    const item = await Item.findById(tracking.item);

    const isValidCompleted = isValidCompletedItemGamification(tracking);

    let isValidDate = false;
    if (item?.highlighted && item?.startDate && item?.endDate) {
        const startDate = moment(item.startDate);
        const endDate = moment(item.endDate);

        isValidDate = moment().isBetween(startDate, endDate);
    }

    yield {
        validated: isValidCompleted && isValidDate,
        meta: {
            itemId: item?._id,
            itemTitle: item?.title,
            itemThumbPath: item?.thumbPath,
        },
    };
}

async function* handleFinishedExamItem({ user, meta }) {
    const { tracking, evaluationResult } = meta;

    const isValidCompleted = evaluationResult.lessonStatus === SCORMLessonStatus.PASSED;

    const item = await Item.findById(tracking.item);

    const achievedValue = evaluationResult?.score;

    yield {
        validated: isValidCompleted,
        achievedValue,
        meta: {
            itemId: item?._id,
            itemTitle: item?.title,
        },
    };
}

async function* handleFinishedItem({ meta }) {
    const { tracking } = meta;

    const isValidCompleted = isValidCompletedItemGamification(tracking);

    const item = await Item.findById(tracking.item);

    yield {
        validated: isValidCompleted,
        meta: {
            itemId: item?._id,
            itemTitle: item?.title,
        },
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

async function* handleFinishedOptionalTrail({ user, meta }) {
    const { tracking } = meta;

    const processedTrails = await getProcessedTrailsGamification(user, tracking);

    const eligibilities = await handleUserEligibilitiesGamification(user.groupsAD);
    const userTags = [...new Set(eligibilities.flatMap((eligibility) => eligibility.tags))];

    const trainingSections = await AssessmentBusiness.listTrainingSectionsStatus(
        user._id,
        userTags
    );

    const activeTrainingSections = trainingSections.filter((trainingSection) => {
        return trainingSection?.hasActiveCycle;
    });

    const optionalTrails = activeTrainingSections.flatMap((activeTrainingSections) => {
        return [...new Set(activeTrainingSections.optionalTrailsId)];
    });

    for (const optionalTrail of optionalTrails) {
        const processedTrail = processedTrails.find((processedTrail) => {
            return processedTrail?._id.equals(optionalTrail);
        });

        const isValidCompleted = isValidCompletedTrailGamification(processedTrail);

        yield {
            validated: isValidCompleted,
            meta: {
                trailId: processedTrail?._id,
                trailTitle: processedTrail?.title,
                trailThumbPath: processedTrail?.thumbPath,
            },
        };
    }
}

async function* handleFinishedSection({ user, meta }) {
    const { tracking } = meta;

    const { trails } = await getTrailsAndUserTrackingsGamification(user, tracking);

    const sections = await Section.find({
        trails: { $in: trails.map((trail) => trail._id) },
        active: 1,
    });

    const sectionsTrails = sections.flatMap((section) => section.trails);

    const trailsSections = await populateTrails(true, {
        _id: {
            $in: sectionsTrails.filter((sectionTrail) => Types.ObjectId.isValid(sectionTrail)),
        },
        enabled: true,
    });

    const trailsItems = trailsSections.flatMap((trail) => trail.items);
    const uniqueTrailsItems = [];
    for (const trailItem of trailsItems) {
        if (trailItem?.itemID?.enabled && !uniqueTrailsItems.includes(trailItem.itemID._id)) {
            uniqueTrailsItems.push(trailItem.itemID._id);
        }
    }

    const allTrackingUser = await Tracking.find({
        userLogin: user.networkLogin,
        item: { $in: uniqueTrailsItems },
        $or: [{ expiredCompletion: { $exists: false } }, { expiredCompletion: { $eq: null } }],
    });

    const processedTrails = trailsSections.map(
        (t) => processTrailTracking(t, allTrackingUser).trail
    );

    for (const section of sections) {
        const sectionTrails = section.trails.filter((sectionTrail) => {
            const foundProcessedTrail = processedTrails.find((processedTrail) => {
                return processedTrail?._id.equals(sectionTrail);
            });

            return foundProcessedTrail?.enabled;
        });

        const isSectionCompleted = sectionTrails.every((trailId) => {
            const foundProcessedTrail = processedTrails.find((processedTrail) => {
                return processedTrail?._id.equals(trailId);
            });

            return isValidCompletedTrailGamification(foundProcessedTrail);
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

    const processedTrails = await getProcessedTrailsGamification(user, tracking);

    for (const processedTrail of processedTrails) {
        const isValidCompleted = isValidCompletedTrailGamification(processedTrail);

        const payload = {
            validated: isValidCompleted,
            meta: {
                trailId: processedTrail?._id,
                trailTitle: processedTrail?.title,
                trailThumbPath: processedTrail?.thumbPath,
            },
        };

        if (isValidCompleted) {
            const uri = `home/share/${process.env.CLIENT_ID}/${processedTrail?._id}`;
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
    }
}

async function* handleFinishedTrail({ user, meta }) {
    const { tracking } = meta;

    const processedTrails = await getProcessedTrailsGamification(user, tracking);

    for (const processedTrail of processedTrails) {
        const isValidCompleted = isValidCompletedTrailGamification(processedTrail);

        let beforeLimitDate;

        if (['fixed', 'availability'].includes(processedTrail?.expirationType?.type || '')) {
            const value = processedTrail.expirationType.value;
            const isFixed = processedTrail.expirationType.type === 'fixed';
            const trailStartDate = moment(processedTrail.startDate);

            const userCreatedAfter = moment(user.createdAt).endOf('day').diff(trailStartDate) >= 0;
            const startDate = moment(userCreatedAfter ? user.createdAt : trailStartDate);

            beforeLimitDate = !isFixed ? startDate.add(value, 'days').toDate() : new Date(value);
        }

        const itemsCompletionAt = processedTrail.items
            .filter((i) => i?.completionAt)
            .map((i) => new Date(i.completionAt));

        const startDate = getSortedDate(itemsCompletionAt, 'asc');
        const endDate = getSortedDate(itemsCompletionAt, 'desc');

        const lastDate = getSortedDate(itemsCompletionAt, 'desc');
        const releaseDate = processedTrail.startDate;

        yield {
            validated: isValidCompleted,
            beforeLimitDate,
            startDate,
            endDate,
            lastDate,
            releaseDate,
            issuer: processedTrail?._id,
            meta: {
                trailId: processedTrail?._id,
                trailTitle: processedTrail?.title,
                trailThumbPath: processedTrail?.thumbPath,
            },
        };
    }
}

async function* handleGetTrailMeta({ meta }) {
    const { trailId } = meta;

    const trail = await Trail.findById(trailId);

    yield {
        validated: true,
        issuer: trailId,
        meta: {
            trailId,
            trailTitle: trail.title,
            trailThumbPath: trail.thumbPath,
        },
    };
}

async function* handleOptionalSurvey({ meta }) {
    const { itemId, survey } = meta;

    const item = await Item.findById(itemId);

    yield {
        validated: item?.survey === 'optional' && survey?.concluded,
        issuer: item._id,
        meta: {
            itemId: item._id,
            itemTitle: item.title,
        },
    };
}

async function* handleSharedContent({ user, meta }) {
    const { trailId } = meta;

    const trail = await Trail.findOne({ _id: trailId, author: { $ne: user._id } });

    const author = await User.findById(trail.author);

    if (author?._id) {
        const eligibilities = await handleUserEligibilitiesGamification(author.groupsAD);

        yield {
            validated: trail?.collaborative,
            networkLogin: author.networkLogin,
            eligibilities,
            issuer: {
                sharedBy: user._id,
                trailId,
            },
            meta: {
                trailId: trail._id,
                trailTitle: trail.title,
                trailThumbPath: trail.thumbPath,
            },
        };
    }
}

async function* handleStartedTrail({ user, meta }) {
    const { tracking } = meta;

    const { trails, allTrackingUser } = await getTrailsAndUserTrackingsGamification(user, tracking);

    for (const trail of trails) {
        const trackings = allTrackingUser
            .filter((tracking) => trail.items.some((item) => item.itemID?.equals?.(tracking.item)))
            .sort((prev, curr) => prev.createdAt.getTime() - curr.createdAt.getTime());

        const hasOne = trackings?.length === 1;
        const createdAt = moment(trackings?.[0]?.createdAt);
        const updatedAt = moment(tracking?.updatedAt);
        const isValidTracking = createdAt.isSame(updatedAt);
        const isSameDay = updatedAt.subtract(3, 'hours').isSame(moment(trail.startDate), 'day');

        yield {
            validated: hasOne && isValidTracking && isSameDay,
            sameDayRelease: updatedAt.subtract(3, 'hours').toDate(),
            meta: {
                trailId: trail._id,
                trailTitle: trail.title,
                trailThumbPath: trail.thumbPath,
            },
        };
    }
}

async function* handleSurvey({ meta }) {
    const { itemId, survey } = meta;

    const item = await Item.findById(itemId);

    yield {
        validated: survey?.concluded,
        issuer: item._id,
        meta: {
            itemId: item._id,
            itemTitle: item.title,
        },
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

    const processedTrails = await getProcessedTrailsGamification(user, tracking);

    for (const processedTrail of processedTrails) {
        yield {
            validated: collabItem?._id && isCompleted && completionAt.isSame(updatedAt, 'day'),
            sameDayRelease: processedTrail?.startDate,
            issuer: processedTrail?._id,
            meta: {
                trailId: processedTrail?._id,
                trailTitle: processedTrail?.title,
                trailThumbPath: processedTrail?.thumbPath,
            },
        };
    }
}

module.exports = GamificationEventBusiness;
