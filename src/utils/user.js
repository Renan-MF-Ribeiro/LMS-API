const { Types } = require("mongoose");
const { UsersWithProcessedTags } = require("../components/courses/model");
const { checkEligibilityTagsAnd, checkIfTheTrackIsValid, getSectionTrailId, isSectionTrailInfo } = require("../components/sections/business");
const { Section } = require("../components/sections/model");
const { Tracking } = require("../components/tracking/model");
const { populateTrails } = require("../components/trails/business");
const { processTrailTracking } = require("./functions");
const { Trail } = require("../components/trails/model");
const { User } = require("../components/users/model");
const { Group } = require("../components/groups/model");

async function getEligibilityInfoByUserId(
    userId,
    options = {
        sections: { skip: null, limit: null, filter: {} },
        trails: { filter: {} },
    },
    tags = null
) {
    const sections = await Section
        .find(options?.sections?.filter ?? {})
        .select('_id title description certificateLayout certificateDue trails isTraining completedTrailsType exceptionCertificateTrails')
        .limit(options?.sections?.limit ?? 0)
        .skip(options?.sections?.skip ?? 0)
        .lean();

    const userWithTags = await UsersWithProcessedTags.findById(userId).lean();
    // console.log("userWithTags", userWithTags);
    let eligibilityTags = tags?.map(tag => tag.value) ?? userWithTags.userTags ?? [];

    const sectionTrails = Array.from(new Set(sections.map(section => section.trails).flat()));

    const trailsId = sectionTrails
        .map(trails => getSectionTrailId(trails))
        .filter(Boolean);

    const populatedTrails = await populateTrails(
        true,
        {
            enabled: true,
            _id: { $in: trailsId },
            ...(options?.trails?.filter ?? {})
        }
    );

    const trailsDb = populatedTrails
        ?.filter(trail => checkEligibilityTagsAnd(eligibilityTags, trail.tagsAnd, trail.tags) && !trail.collaborative)
        ?.filter((trail) => checkIfTheTrackIsValid(trail));

    const allItemsId = Array.from(
        new Set(
            trailsDb.map(trail => trail.items.map(
                item => item.itemID?._id
            )).flat()
        )
    );

    const allTrackingUser = await Tracking.find({
        userLogin: userWithTags.networkLogin,
        item: {
            $in: allItemsId
        },
        $or: [
            { expiredCompletion: { $exists: false } },
            { expiredCompletion: { $eq: null } },
        ],
    });

    const allTrails = trailsDb.map((trail) => {
        const processedTrail = processTrailTracking(trail, allTrackingUser);
        return processedTrail.trail;
    });

    const allSections = sections.map(section => {
        const sectionTrails = section.trails.map(
            trailInfo => {
                if (isSectionTrailInfo(trailInfo)) {
                    const trailId = getSectionTrailId(trailInfo);
                    const trail = allTrails.find(
                        trail => String(trail._id) === String(trailId)
                    );

                    return trail ?? trailInfo;
                }

                return trailInfo;
            }
        );

        return { ...section, trails: sectionTrails }
    });

    return {
        user: userWithTags,
        sections: allSections,
        trails: allTrails,
        trackings: allTrackingUser
    };
}

async function getInfoByUserId(
    user,
    options = {
        sections: { skip: null, limit: null, filter: {} },
        trails: { filter: {} },
    },
) {
    const sections = await Section
        .find(options?.sections?.filter ?? {})
        .select('_id title description certificateLayout certificateDue trails isTraining completedTrailsType exceptionCertificateTrails')
        .limit(options?.sections?.limit ?? 0)
        .skip(options?.sections?.skip ?? 0)
        .lean();

    const sectionTrails = Array.from(new Set(sections.map(section => section.trails).flat()));

    const trailsId = sectionTrails
        .map(trails => getSectionTrailId(trails))
        .filter(Boolean);

    const populatedTrails = await populateTrails(
        true,
        {
            enabled: true,
            _id: { $in: trailsId },
            ...(options?.trails?.filter ?? {})
        }
    );

    const allTrackingUser = await Tracking.find({
        userLogin: user.networkLogin,
        kind: { $ne: 'PostTracking' },
        $or: [
            { expiredCompletion: { $exists: false } },
            { expiredCompletion: { $eq: null } },
        ],
    });

    const allTrails = populatedTrails.map((trail) => {
        const processedTrail = processTrailTracking(trail, allTrackingUser);
        let processedTrailData = processedTrail.trail;

        processedTrailData.items = processedTrailData.items.filter((item) =>
            item.itemID?._id &&
            item.itemID.enabled &&
            (!item.itemID.archive && item.itemID.enabled) &&
            item.itemID.kind !== 'PostItem'
        );

        const allValidItems = processedTrailData.items.length;
        const completedItems = processedTrailData.items.filter(item =>
            item.itemID?.completion === 1
        ).length;

        processedTrailData.completion = allValidItems > 0 ? completedItems / allValidItems : 0;

        let trailDuration = 0;
        for (const item of processedTrailData.items) {
            trailDuration += item?.itemID?.durationHours || 0;
        }
        processedTrailData.duration = trailDuration;

        return processedTrailData;
    });

    const allSections = sections.map(section => {
        const sectionTrails = section.trails.map(trailInfo => {
            if (isSectionTrailInfo(trailInfo)) {
                const trailId = getSectionTrailId(trailInfo);
                const trail = allTrails.find(
                    trail => String(trail._id) === String(trailId)
                );

                if (trail) {
                    return trail;
                } else {
                    return trailInfo;
                }
            }

            return trailInfo;
        });

        return { ...section, trails: sectionTrails }
    });

    return {
        sections: allSections,
        trails: allTrails,
        trackings: allTrackingUser
    };
}

/**
 * Checks if a user has eligibility for specified trails based on their tags and eligibility type.
 * 
 * @async
 * @function userHasEligibilityForTrails
 * @param {string|Types.ObjectId} userId - ID of the user to check eligibility for
 * @param {string[]} trailsIds - Array of trail IDs to check eligibility for
 * @param {string} [eligibilityType='some'] - Type of eligibility check: 'some' (at least one trail) or 'every' (all trails) - default is 'some'
 * @returns {Promise<Object>} Object containing eligibility status and eligible trails
 * @returns {Promise<boolean>} returns.hasEligibility - Whether the user has eligibility based on the specified type
 * @returns {Promise<Object[]>} returns.trails - Array of eligible trail objects with populated items and evaluations
 * 
 * @description
 * This function performs the following operations:
 * 1. Returns early with hasEligibility: true if no trail IDs are provided
 * 2. Retrieves user's eligible tags from the authentication token
 * 3. Queries enabled, non-archived trails within the valid date range that match user tags
 * 4. Populates trail items and their evaluations (filtering for enabled/active records)
 * 5. Filters trails based on tag eligibility and excludes collaborative trails
 * 6. Determines eligibility based on the specified type (some/every matching trail IDs)
 * 
 * @example
 * // Check if user has eligibility for all specified trails
 * const result = await userHasEligibilityForTrails(userId, ['trail1', 'trail2'], 'every');
 * 
 * @example
 * // Check if user has eligibility for at least one trail
 * const result = await userHasEligibilityForTrails(userId, ['trail1', 'trail2'], 'some');
 */
async function userHasEligibilityForTrails(userId, trailsIds, eligibilityType = 'some') {
    if (!trailsIds?.length) return { hasEligibility: false, trails: [] };

    const user = await User.findById(new Types.ObjectId(userId)).lean();

    const userGroups = user.groupsAD?.filter(tag => !String(tag).startsWith('PERFIL')) ?? [];

    const groups = await Group.find({ name: { $in: userGroups } }).lean();

    const userTags = [...groups.flatMap(g => g.tags)];

    const currentDate = new Date();

    if (user.classGroups.length > 0) {
        for (const classGroup of user.classGroups) {
            if (
                classGroup.status === 2 &&
                new Date(classGroup.startDate) <= currentDate &&
                new Date(classGroup.limitDate) >= currentDate
            ) {
                userTags.push({
                    display: classGroup.groupCode,
                    value: classGroup.groupCode,
                });
            }
        }
    }

    const trails = await Trail.find({
        _id: { $in: trailsIds.map(id => new Types.ObjectId(id)) },
        enabled: true,
        archive: { $ne: true },
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
        $or: [
            { tags: { $in: userTags } },
            { tagsAnd: { $in: userTags } },
        ],
    })
        .select({ _id: 1, title: 1, tags: 1, tagsAnd: 1 })
        .lean();

    const eligibleTrails = trails.filter(trail => checkEligibilityTagsAnd(userTags, trail.tagsAnd, trail.tags) && !trail.collaborative);

    const eligibleTrailsSet = new Set(eligibleTrails.map(trail => String(trail._id)));

    const hasEligibility = eligibilityType === 'some'
        ? trailsIds.some(id => eligibleTrailsSet.has(String(id)))
        : trailsIds.every(id => eligibleTrailsSet.has(String(id)));

    return { hasEligibility, trails: eligibleTrails };
}

module.exports = {
    getEligibilityInfoByUserId,
    getInfoByUserId,
    userHasEligibilityForTrails,
}