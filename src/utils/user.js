const { Types } = require("mongoose");
const { UsersWithProcessedTags } = require("../components/courses/model");
const { checkEligibilityTagsAnd, checkIfTheTrackIsValid } = require("../components/sections/business");
const { Section } = require("../components/sections/model");
const { Tracking } = require("../components/tracking/model");
const { populateTrails } = require("../components/trails/business");
const { processTrailTracking } = require("./functions");

async function getEligibilityInfoByUserId(
    userId,
    options = {
        sections: { skip: null, limit: null, filter: {} },
        trails: { filter: {} },
    }
) {
    const sections = await Section
        .find(options?.sections?.filter ?? {})
        .select('_id title description certificateLayout certificateDue trails isTraining')
        .limit(options?.sections?.limit ?? 0)
        .skip(options?.sections?.skip ?? 0)
        .lean();

    const userWithTags = await UsersWithProcessedTags.findById(userId).lean();

    const eligibilityTags = userWithTags.userTags;

    const trailsId = Array.from(new Set(sections.map(section => section.trails).flat()));

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
                item => item.itemID._id
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
        const sectionTrails = allTrails.filter(
            trail => section.trails
                .map(trailId => String(trailId))
                .includes(String(trail._id))
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

module.exports = {
    getEligibilityInfoByUserId
}