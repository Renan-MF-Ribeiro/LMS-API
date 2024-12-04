const { TrailsTagsWithUsersAndTrackings, Trail } = require('../trails/model');
const { User, LastLogin } = require('../users/model');
const {
    getUsersByIds,
    getUsersByTags,
    getUsersByGroups,
    getUsersByTrail,
} = require('../users/business');

const clientid = process.env.CLIENT_ID;

require('dotenv').config();
const kafka = require('../../utils/kafka');
const { processTrailTracking, sleep } = require('../../utils/functions');
const { generateSSOToken } = require('../../utils/auth');
const { Item } = require('../items/model');

module.exports = {
    async processTargetUsers(target, category) {
        try {
            const { type, value } = target;

            const users = await returnUsersBasedOnTarget(type, value, category);
            return users;
        } catch (error) {}
    },

    async sendMessageToKafka(campaign, users) {
        try {
            const producer = kafka.producer();
            await producer.connect();
            const messages = [];
            for (const user of users) {
                for (const communication of campaign.communication) {
                    const stringMessage = JSON.stringify(
                        await processMessage({ ...campaign, communication }, user)
                    );
                    messages.push({ value: stringMessage });
                }
            }
            const chunk = 10;
            for (let i = 0; i < messages.length; i += chunk) {
                const temporary = messages.slice(i, i + chunk);
                await producer.send({
                    topic: process.env.TOPIC_MSG,
                    messages: temporary,
                });
            }

            await producer.disconnect();
        } catch (error) {
            console.error(error);
            throw error;
        }
    },

    async sendCustomMessageToKafka(message, topic) {
        try {
            const producer = kafka.producer();
            await producer.connect();
            const stringMessage = JSON.stringify(message);
            await producer.send({
                topic,
                messages: [{ value: stringMessage }],
            });

            await producer.disconnect();
        } catch (error) {
            console.error(error);
            throw error;
        }
    },

    async sendMfaToKafka(campaign, users) {
        try {
            const producer = kafka.producer();
            await producer.connect();
            const messages = [];
            for (const user of users) {
                const stringMessage = JSON.stringify(await processMessage(campaign, user));
                messages.push({ value: stringMessage });
            }
            const chunk = 10;
            for (let i = 0; i < messages.length; i += chunk) {
                console.log(process.env.TOPIC_MFA);
                const temporary = messages.slice(i, i + chunk);
                await producer.send({
                    topic: process.env.TOPIC_MFA,
                    messages: temporary,
                });
            }

            await producer.disconnect();
        } catch (error) {
            console.error(error);
            throw error;
        }
    },

    async sendRecoveryMessageToKafka(campaign, users) {
        try {
            const producer = kafka.producer();
            await producer.connect();
            const messages = [];
            for (const user of users) {
                for (const communication of campaign.communication) {
                    const stringMessage = JSON.stringify(
                        await processRecoveryMessage({ ...campaign, communication }, user)
                    );
                    messages.push({ value: stringMessage });
                }
            }
            const chunk = 10;
            for (let i = 0; i < messages.length; i += chunk) {
                const temporary = messages.slice(i, i + chunk);
                await producer.send({
                    topic: process.env.TOPIC_MSG,
                    messages: temporary,
                });
            }

            await producer.disconnect();
        } catch (error) {
            console.error(error);
            throw error;
        }
    },

    async getUserList(trailFilters, userFilter) {
        let dbCounter = 0;

        try {
            const februaryFirst = new Date('02-01-2022');
            const now = new Date();

            let messagingList = [];

            if (trailFilters.enable) {
                const allFiltersResponses = [];
                for (const currentFilter of trailFilters.filters) {
                    const { trail, notInit, inProgress, finished, ignoreSendInBlueAccept } =
                        currentFilter;

                    let currentFilterResponse = [];

                    const query = {
                        title: trail,
                        $and: [{ 'user.updatedAt': { $gte: februaryFirst } }],
                    };

                    // if (!ignoreSendInBlueAccept) {
                    //     query['user.sendInBlueAccept'] = true;
                    // }

                    if (notInit) {
                        const notInitUsers = [];

                        const fourtyFiveDaysAgo = new Date(
                            now.getTime() - 45 * 24 * 60 * 60 * 1000
                        );
                        for (
                            let period = fourtyFiveDaysAgo;
                            period < now;
                            period = getFiveDaysAfter(period)
                        ) {
                            const periodStart = new Date(period);
                            const fiveDaysAfter = getFiveDaysAfter(periodStart);
                            const periodEnd = fiveDaysAfter >= now ? now : fiveDaysAfter;

                            query.$and = [
                                { 'user.updatedAt': { $gte: februaryFirst } },
                                { 'user.updatedAt': { $gt: periodStart } },
                                { 'user.updatedAt': { $lte: periodEnd } },
                            ];

                            const usersInTrail = await TrailsTagsWithUsersAndTrackings.find(query);
                            await sleep(1000);
                            dbCounter += 1;

                            for (const { user, trackings } of usersInTrail) {
                                const name = user.name;
                                const email = user.email;

                                const userCompletedTrackings = trackings.filter(
                                    (tracking) =>
                                        tracking.completionAt !== null &&
                                        tracking.completionAt !== undefined
                                );

                                if (userCompletedTrackings.length === 0) {
                                    notInitUsers.push({ name, email });
                                }
                            }
                        }

                        currentFilterResponse = currentFilterResponse.concat(notInitUsers);
                        query.$and = [{ 'user.updatedAt': { $gte: februaryFirst } }];
                    }

                    if (inProgress) {
                        const inProgressUsers = [];

                        const progressMinimumPercentage = currentFilter.inProgressSlider[0];
                        const progressMaximumPercentage = currentFilter.inProgressSlider[1];

                        const progressMinDate = new Date(currentFilter.inProgressInitialDate);
                        const progressMaxDate = new Date(currentFilter.inProgressFinalDate);

                        for (
                            let period = februaryFirst;
                            period < now;
                            period = getFiveDaysAfter(period)
                        ) {
                            const periodStart = new Date(period);
                            const fiveDaysAfter = getFiveDaysAfter(periodStart);
                            const periodEnd = fiveDaysAfter >= now ? now : fiveDaysAfter;

                            query.$and = [
                                { 'user.updatedAt': { $gt: periodStart } },
                                { 'user.updatedAt': { $lte: periodEnd } },
                            ];
                            const usersInTrail = await TrailsTagsWithUsersAndTrackings.find(query);
                            await sleep(1000);
                            dbCounter += 1;

                            for (const { user, items, trackings } of usersInTrail) {
                                const userCompletedTrackings = trackings.filter(
                                    (tracking) =>
                                        tracking.completionAt !== null &&
                                        tracking.completionAt !== undefined
                                );

                                if (userCompletedTrackings.length === 0) {
                                    continue;
                                }

                                const percentage =
                                    (100 * userCompletedTrackings.length) / items.length;
                                if (
                                    percentage >= progressMinimumPercentage &&
                                    percentage <= progressMaximumPercentage
                                ) {
                                    const firstTracking = userCompletedTrackings.reduce(
                                        (acc, current) =>
                                            acc.completionAt <= current.completionAt
                                                ? { ...acc }
                                                : { ...current }
                                    );

                                    const lastTracking = userCompletedTrackings.reduce(
                                        (acc, current) =>
                                            acc.completionAt >= current.completionAt
                                                ? { ...acc }
                                                : { ...current }
                                    );

                                    const firstTrackingCompletionAt =
                                        typeof firstTracking.completionAt === 'string'
                                            ? new Date(firstTracking.completionAt)
                                            : firstTracking.completionAt;

                                    const lastTrackingCompletionAt =
                                        typeof lastTracking.completionAt === 'string'
                                            ? new Date(lastTracking.completionAt)
                                            : lastTracking.completionAt;

                                    if (
                                        firstTrackingCompletionAt >= progressMinDate &&
                                        lastTrackingCompletionAt <= progressMaxDate
                                    ) {
                                        inProgressUsers.push({
                                            name: user.name,
                                            email: user.email,
                                        });
                                    }
                                }
                            }
                        }

                        currentFilterResponse = currentFilterResponse.concat(inProgressUsers);
                        query.$and = [{ 'user.updatedAt': { $gte: februaryFirst } }];
                    }

                    if (finished) {
                        const finishedUsers = [];

                        const finishedMinDate = new Date(currentFilter.finishedInitialDate);
                        const finishedMaxDate = new Date(currentFilter.finishedFinalDate);

                        for (
                            let period = februaryFirst;
                            period < now;
                            period = getFiveDaysAfter(period)
                        ) {
                            const periodStart = new Date(period);
                            const fiveDaysAfter = getFiveDaysAfter(periodStart);
                            const periodEnd = fiveDaysAfter >= now ? now : fiveDaysAfter;

                            query.$and = [
                                { 'user.updatedAt': { $gt: periodStart } },
                                { 'user.updatedAt': { $lte: periodEnd } },
                            ];
                            const usersInTrail = await TrailsTagsWithUsersAndTrackings.find(query);
                            await sleep(1000);
                            dbCounter += 1;

                            for (const { user, items, trackings } of usersInTrail) {
                                const userCompletedTrackings = trackings.filter(
                                    (tracking) =>
                                        tracking.completionAt !== null &&
                                        tracking.completionAt !== undefined
                                );
                                if (userCompletedTrackings.length === 0) {
                                    continue;
                                }

                                const percentage =
                                    (100 * userCompletedTrackings.length) / items.length;
                                if (percentage === 100) {
                                    const lastTracking = userCompletedTrackings.reduce(
                                        (acc, current) =>
                                            acc.completionAt >= current.completionAt
                                                ? { ...acc }
                                                : { ...current }
                                    );

                                    const lastTrackingCompletionAt =
                                        typeof lastTracking.completionAt === 'string'
                                            ? new Date(lastTracking.completionAt)
                                            : lastTracking.completionAt;

                                    if (
                                        lastTrackingCompletionAt >= finishedMinDate &&
                                        lastTrackingCompletionAt <= finishedMaxDate
                                    ) {
                                        if (currentFilter.enableScore) {
                                            const finishedMinimumScore =
                                                currentFilter.finishedSlider[0];
                                            const finishedMaximumScore =
                                                currentFilter.finishedSlider[1];

                                            const {
                                                trail: { scoreAverage },
                                            } = processTrailTracking({ items }, trackings);
                                            const score =
                                                scoreAverage === null ? 100 : scoreAverage;

                                            if (
                                                score >= finishedMinimumScore &&
                                                score <= finishedMaximumScore
                                            ) {
                                                finishedUsers.push({
                                                    name: user.name,
                                                    email: user.email,
                                                });
                                            }
                                        } else {
                                            finishedUsers.push({
                                                name: user.name,
                                                email: user.email,
                                            });
                                        }
                                    }
                                }
                            }
                        }

                        currentFilterResponse = currentFilterResponse.concat(finishedUsers);
                        query.$and = [{ 'user.updatedAt': { $gte: februaryFirst } }];
                    }

                    allFiltersResponses.push(currentFilterResponse);
                }
                messagingList = getCommonObjects(allFiltersResponses);
            }

            if (userFilter.enable) {
                const {
                    accessInitialDate,
                    accessFinalDate,
                    registrationInitialDate,
                    registrationFinalDate,
                    ignoreSendInBlueAccept,
                } = userFilter.filters[0];

                const initialDateReg = new Date(registrationInitialDate);
                const finalDateReg = new Date(registrationFinalDate);

                const initialDateLog = new Date(accessInitialDate);
                const finalDateLog = new Date(accessFinalDate);

                const usersQuery = {
                    updatedAt: { $gte: februaryFirst },
                };
                // if (!ignoreSendInBlueAccept) {
                //     usersQuery.sendInBlueAccept = true;
                // }

                for (
                    let period = initialDateReg;
                    period < finalDateReg;
                    period = getFiveDaysAfter(period)
                ) {
                    const periodBegin = new Date(period);
                    const fiveDaysAfter = getFiveDaysAfter(periodBegin);
                    const periodEnd = fiveDaysAfter >= finalDateReg ? finalDateReg : fiveDaysAfter;

                    usersQuery.$and = [
                        { createdAt: { $gte: periodBegin } },
                        { createdAt: { $lt: periodEnd } },
                    ];

                    const usersInPeriod = await User.find(usersQuery);
                    dbCounter += 1;

                    for (const { _id, name, email } of usersInPeriod) {
                        const userLastLogin = await LastLogin.findOne({
                            user: _id,
                        });
                        dbCounter += 1;

                        if (
                            userLastLogin &&
                            userLastLogin.lastLogin >= initialDateLog &&
                            userLastLogin.lastLogin <= finalDateLog
                        ) {
                            messagingList.push({
                                name,
                                email,
                            });
                        }
                    }
                }
            }

            console.log({ messaginListLength: messagingList.length });

            const nonDuplicate = messagingList.filter(
                (v, i, a) => a.findIndex((v2) => v2.name === v.name && v2.email === v.email) === i
            );

            const orderedList = nonDuplicate.sort((a, b) => a.name.localeCompare(b.name));

            console.log({ getUserListDbCalls: dbCounter });
            return orderedList;
        } catch (error) {
            console.error(error);
            throw error;
        }
    },

    async returnListOfIds(users) {
        const userIds = [];

        for (const userData of users) {
            const user = await User.findOne({
                name: userData.name,
                email: userData.email,
            });
            if (user && user._id) userIds.push(user._id);
        }

        return userIds;
    },
};

async function processMessage(campaign, user) {
    let { communication, target, ...data } = campaign;
    target.recovery = campaign.recovery;
    target.resetPasswordUrl = campaign.resetPasswordUrl;
    target.value.user = user;

    try {
        const notificationlink = await processNotificationLink(target, communication);
        const foundUser = await User.findById(user._id).select('email networkLogin deviceId -_id');

        const message = {
            clientid,
            type: communication,
            ...data,
            identifier: foundUser.networkLogin,
            viewed: false,
            userEmail: campaign.userEmail
                ? campaign.userEmail
                : foundUser.email
                ? foundUser.email
                : null,
            userDevice: foundUser.deviceId ? foundUser.deviceId : null,
            notificationlink,
        };
        return message;
    } catch (error) {
        console.error(error);
    }
}

async function processRecoveryMessage(campaign, user) {
    try {
        let { communication, target, ...data } = campaign;
        target.recovery = campaign.recovery;
        target.resetPasswordUrl = campaign.resetPasswordUrl;
        const foundUser = await User.findOne({ _id: user });
        const userEmailAndDeviceId = await User.findById(user._id).select('email deviceId -_id');

        const message = {
            clientid,
            type: communication,
            ...data,
            identifier: foundUser.networkLogin,
            viewed: false,
            userEmail: campaign.userEmail
                ? campaign.userEmail
                : userEmailAndDeviceId.email
                ? userEmailAndDeviceId.email
                : null,
            userDevice: userEmailAndDeviceId.deviceId ? userEmailAndDeviceId.deviceId : null,
        };
        return message;
    } catch (error) {
        console.error(error);
    }
}

async function processNotificationLink(target, communication) {
    const { type } = target;

    let response = undefined;

    if (!type) {
        response = {
            url: `${process.env.DOMAIN}/login/entrar?redirectTo=/home`,
        };
    }

    if (target.content) {
        const { type, value } = target.content;

        switch (type) {
            case 'trail': {
                const trailid = value ? value : target.value.trailId;
                const _trail = await Trail.findOne({ _id: trailid });
                const item = target.value.itemId ? await Item.findOne({ _id: value.itemId }) : null;

                const redirectTo = item
                    ? `/player/${_trail.titleURL}/${item.titleURL}`
                    : `/menu/${_trail.titleURL}`;

                response = {
                    trailid,
                    itemid: target.value.itemId || '',
                    url: `${process.env.DOMAIN}/login/entrar?redirectTo=${redirectTo}`,
                };
                break;
            }
            case 'post': {
                const url = `${process.env.DOMAIN}/app/home/canal/feed/post/${value}`;
                response = {
                    postId: target.postId,
                    url,
                };
                break;
            }
            case 'comment': {
                const url = `${process.env.DOMAIN}/app/home/canal/feed/post/${value}`;
                response = {
                    postId: target.postId,
                    commentId: value,
                    url,
                };
                break;
            }
            default:
                response = {
                    url: `${process.env.DOMAIN}/login/entrar?redirectTo=/home`,
                };
        }
    }
    return response;
}

async function returnUsersBasedOnTarget(type, value, category) {
    try {
        const users = [];
        if (type === 'trail') {
            users.push(...(await getUsersByTrail(value.trailId, category)));
        } else if (type === 'group') {
            users.push(...(await getUsersByGroups(value.group)));
        } else if (type === 'tag') {
            users.push(...(await getUsersByTags(value.tags)));
        } else if (type === 'users') {
            users.push(...(await getUsersByIds(value.users)));
        }
        return users;
    } catch (error) {
        return error;
    }
}

function getCommonObjects(arrays) {
    let arr = arrays[0];
    for (let i = 1; i < arrays.length; i += 1) {
        const temp = [];
        for (let j = 0; j < arrays[i].length; j += 1) {
            if (
                arr.some((el) => el.name === arrays[i][j].name && el.email === arrays[i][j].email)
            ) {
                temp.push(arrays[i][j]);
            }
        }
        arr = temp;
    }
    return arr;
}

function getFiveDaysAfter(date) {
    const daysToAdd = 5;
    return new Date(date.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
}
