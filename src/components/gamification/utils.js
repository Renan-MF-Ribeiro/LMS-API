const {
    processTrailTracking,
    calculateDiffDate,
    formatDateWithoutHours,
    getDateTodayWithoutHours,
    handleStudentTrails,
} = require('../../utils/functions');
const { Group } = require('../groups/model');
const { Tracking } = require('../tracking/model');
const { populateTrails } = require('../trails/business');
const moment = require('moment');
const { Trail } = require('../trails/model');

async function handleUserEligibilitiesGamification(userGroupsAD) {
    const groupsAD = userGroupsAD.filter((tag) => !String(tag).startsWith('PERFIL_'));
    const groups = await Group.find({ name: { $in: groupsAD }, deleted: 0 });
    const eligibilities = groups.map(({ name, tags }) => ({
        name,
        tags: tags.map(({ value }) => value),
    }));
    return eligibilities;
}

async function handleGroupTagsGamification(eligibilities) {
    const groups = await Group.find({ tags: { $in: eligibilities }, active: 1, deleted: 0 });
    const tags = eligibilities.map(({ value }) => value);
    const groupsTags = groups.map(({ name }) => ({ name, tags: [...new Set(tags)] }));
    return groupsTags;
}

async function getTrailsGamification(tracking) {
    const trails = await populateTrails(true, {
        enabled: true,
        'items.itemID': tracking.item,
    });

    return trails;
}

async function getUserTrackingsGamification(user) {
    const allTrackingUser = await Tracking.find({
        userLogin: user.networkLogin,
        $or: [
            {
                expiredCompletion: { $exists: false },
            },
            {
                expiredCompletion: { $eq: null },
            },
        ],
    });

    return allTrackingUser;
}

async function getTrailsAndUserTrackingsGamification(user, tracking) {
    const trails = await getTrailsGamification(tracking);

    const allTrackingUser = await getUserTrackingsGamification(user);

    return { trails, allTrackingUser };
}

async function getProcessedTrailsGamification(user, tracking) {
    const { trails, allTrackingUser } = await getTrailsAndUserTrackingsGamification(user, tracking);

    return trails.map((trail) => processTrailTracking(trail, allTrackingUser).trail);
}

function isValidCompletedTrailGamification(processedTrail) {
    if (!processedTrail?.completionAt || !processedTrail?.lastTrackingUpdate) {
        return false;
    }

    const completionAt = moment(processedTrail.completionAt).startOf('second');
    const updatedAt = moment(processedTrail.lastTrackingUpdate).startOf('second');

    return processedTrail?.completion === 1 && completionAt.isSame(updatedAt);
}

function isValidCompletedItemGamification(tracking) {
    const lessonStatus = tracking?.lessonStatus || '';
    const completion = tracking?.completion === 1;
    const completedLesson = ['passed', 'completed'].includes(lessonStatus);
    const isCompleted = completion || completedLesson;
    const completionAt = moment(tracking?.completionAt);
    const updatedAt = moment(tracking?.updatedAt);

    return isCompleted && completionAt.isSame(updatedAt);
}

async function getPercentageCompletedTrailsGamification(user) {
    const groupsAD = user?.groupsAD || [];

    const groups = await Group.find({ name: { $in: groupsAD } });

    const tags = groups.flatMap((group) => group.tags);

    if (user.classGroups.length > 0) {
        const mappedUserClassGroups = user.classGroups.map((classGroup) => ({
            display: classGroup.groupCode,
            value: classGroup.groupCode,
        }));

        tags.push(...mappedUserClassGroups);
    }

    if (user.tags.length > 0) {
        const filteredUserTags = user.tags.filter((tag) => {
            const diff = calculateDiffDate(
                getDateTodayWithoutHours(),
                formatDateWithoutHours(tag.createdAt),
                'days'
            );

            return diff <= 30;
        });

        const mappedUserTags = filteredUserTags.map((tag) => ({
            display: tag.display,
            value: tag.value,
        }));

        tags.push(...mappedUserTags);
    }

    const eligibleTrails = await Trail.find({
        tags: { $in: tags },
        enabled: true,
        startDate: { $lt: getDateTodayWithoutHours() },
        endDate: { $gt: getDateTodayWithoutHours() },
    })
        .sort({ createdAt: -1 })
        .populate('items.itemID');

    const totalTrails = eligibleTrails.length;

    const { completedTrails } = await handleStudentTrails(user, eligibleTrails);

    return Number(((completedTrails.length / totalTrails) * 100).toFixed(2));
}

module.exports = {
    handleUserEligibilitiesGamification,
    handleGroupTagsGamification,
    getTrailsGamification,
    getProcessedTrailsGamification,
    getUserTrackingsGamification,
    getTrailsAndUserTrackingsGamification,
    isValidCompletedTrailGamification,
    isValidCompletedItemGamification,
    getPercentageCompletedTrailsGamification,
};
