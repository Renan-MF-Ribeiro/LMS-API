const { Types } = require("mongoose");
const { UsersWithProcessedTags } = require("../components/courses/model");
const { checkEligibilityTagsAnd, checkIfTheTrackIsValid, getSectionTrailId, isSectionTrailInfo } = require("../components/sections/business");
const { Section } = require("../components/sections/model");
const { Tracking } = require("../components/tracking/model");
const { populateTrails } = require("../components/trails/business");
const { processTrailTracking } = require("./functions");

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
    console.log("userWithTags", userWithTags);
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

module.exports = {
    getEligibilityInfoByUserId,
    getInfoByUserId
}