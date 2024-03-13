/* eslint-disable no-async-promise-executor */
const momentz = require('moment-timezone');
const moment = require('moment');
const _auth = require('./auth');
const chance = require('chance')();
const { Log } = require('../components/logs/model');
const { User } = require('../components/users/model');
const { Group } = require('../components/groups/model');
const { SCORMLessonStatus } = require('../components/tracking/model');
const { HistoricEvaluation } = require('../components/assessments/model');
const { Tracking } = require('../components/tracking/model');
const { Trail } = require('../components/trails/model');
const { Item } = require('../components/items/model');

module.exports = {
    getDateToday() {
        return momentz().format('YYYY-MM-DD HH:mm:ss');
    },

    getDateTodayExtensive() {
        return (
            momentz().format('DD') +
            ' de ' +
            nameMonth(momentz().format('M')) +
            ' de ' +
            momentz().format('YYYY')
        );
    },

    formatDate(date) {
        return momentz(date).format('YYYY-MM-DD HH:mm:ss');
    },

    formatDateWithoutHours(date) {
        if (!date) {
            return null;
        }
        return momentz(date).format('YYYY-MM-DD');
    },

    findObjectInRange(data, referenceDate) {
        let foundObject = null;

        for (const obj of data) {
            if (obj.startDate <= referenceDate && obj.limitDate >= referenceDate) {
                foundObject = obj;
                break;
            }
        }

        if (foundObject) {
            return foundObject;
        } else {
            // Se nenhum objeto for encontrado no intervalo, encontre o objeto mais próximo
            let closestDateDiff = Infinity;

            for (const obj of data) {
                const startDateDiff = Math.abs(referenceDate - obj.startDate);
                const limitDateDiff = Math.abs(referenceDate - obj.limitDate);

                if (startDateDiff < closestDateDiff) {
                    foundObject = obj;
                    closestDateDiff = startDateDiff;
                }

                if (limitDateDiff < closestDateDiff) {
                    foundObject = obj;
                    closestDateDiff = limitDateDiff;
                }
            }
            return foundObject;
        }
    },

    formatDateWithoutHoursBrasilian(date) {
        if (!date) {
            return null;
        }
        return momentz(date).add(3, 'hours').format('DD/MM/YYYY');
    },

    getDateTodayWithoutHours() {
        return momentz().format('YYYY-MM-DD');
    },

    subtractHours(date) {
        return momentz(date).subtract('3', 'hours').format('YYYY-MM-DD HH:mm:ss');
    },

    calculateDiffDate(dateInitial, dateFinal, format) {
        return moment(dateInitial).diff(dateFinal, format);
    },

    getDates(DATA_INICIO, DATA_FIM) {
        const startDate = new Date(DATA_INICIO);
        const limitDate = new Date(DATA_FIM);

        const startDay = startDate.getDate();
        const startMonth = startDate.getMonth() + 1;
        const startYear = startDate.getFullYear();

        const limitDay = limitDate.getDate();
        const limitMonth = limitDate.getMonth() + 1;
        const limitYear = limitDate.getFullYear();

        const startString = `${startYear}-${startMonth >= 10 ? startMonth : '0' + startMonth}-${
            startDay >= 10 ? startDay : '0' + startDay
        }T00:00:00.000-03:00`;

        const limitString = `${limitYear}-${limitMonth >= 10 ? limitMonth : '0' + limitMonth}-${
            limitDay >= 10 ? limitDay : '0' + limitDay
        }T23:59:59.000-03:00`;

        return {
            startDate: new Date(startString),
            limitDate: new Date(limitString),
        };
    },

    getDataByToken(req) {
        const dataToken = _auth.decodeToken(req.headers.authorization);
        return dataToken.data;
    },

    returnsLetterPosition(letter) {
        const alfabetic = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        return alfabetic.indexOf(letter);
    },

    returnSliceDataRandom(data, initial, final) {
        const dataSlice = chance.shuffle(data).slice(initial, final);
        return dataSlice;
    },

    pagination(req) {
        const { pageSize, pageIndex } = req.query;
        let skip = pageIndex || 0;
        const limit = pageSize || 10;

        if (skip > 0) {
            skip = limit * pageIndex;
        }

        return { skip, limit };
    },

    ordernation(req) {
        const { orderBy, direction } = req.query;
        let order = 'createdAt';
        let sort = 'desc';

        if (orderBy) order = orderBy;
        if (direction) sort = direction;

        return { order, sort };
    },

    formatExcelDateToString(date) {
        const dateArray = date.split(' ');
        const month = returnMonthNumber(dateArray[1]);
        const newDate = `${dateArray[2]}/${month}/${dateArray[3]}`;
        return newDate;
    },

    recordLog(
        req,
        type,
        message,
        component,
        route,
        dataNew = null,
        dataOld = null,
        namesGroups = null,
        dataUser = null
    ) {
        return new Promise(async (resolve, reject) => {
            try {
                const token = req.headers.authorization;
                let user;

                if (token) {
                    try {
                        var { data } = _auth.decodeToken(token);
                        user = await User.findOne({ _id: { $eq: data.ref } });
                    } catch {}
                }
                const userLogin = dataUser ? dataUser.networkLogin : null;
                const userId = dataUser ? dataUser.userId : null;
                await Log.create({
                    user: user ? user._id : userId,
                    type,
                    message,
                    component,
                    dataNew,
                    dataOld,
                    route,
                    ip: req.ip,
                    login: req.body.login ? req.body.login : userLogin,
                    groups: namesGroups,
                });
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },

    sleep(milliseconds) {
        return new Promise((resolve) => setTimeout(resolve, milliseconds));
    },

    getUserByToken(req) {
        return new Promise(async (resolve, reject) => {
            try {
                const token = req.headers.authorization;
                const { data } = _auth.decodeToken(token);
                const user = await User.findOne({ _id: { $eq: data.ref } });
                resolve(user);
            } catch (error) {
                reject(error);
            }
        });
    },

    getGroupByToken(req) {
        return new Promise(async (resolve, reject) => {
            try {
                const token = req.headers.authorization;
                const { data } = _auth.decodeToken(token);

                const group = await Group.findOne({ _id: { $eq: data.group } });
                resolve(group);
            } catch (error) {
                reject(error);
            }
        });
    },

    getTagsGroupsByToken(req) {
        return new Promise(async (resolve, reject) => {
            try {
                const token = req.headers.authorization;
                const { data } = _auth.decodeToken(token);
                const groups = data.groups;
                const tagsTemp = [];
                const tags = [];

                for (const p in groups) {
                    const group = await Group.findOne({
                        _id: { $eq: groups[p] },
                        active: 1,
                    });

                    if (group) {
                        tagsTemp.push(group.tags);
                    }
                }

                for (const p in tagsTemp) {
                    for (const i in tagsTemp[p]) {
                        tags.push(tagsTemp[p][i]);
                    }
                }

                resolve(tags);
            } catch (error) {
                reject(error);
            }
        });
    },

    isSCORMCompleted(status = '') {
        return [
            SCORMLessonStatus.COMPLETED,
            SCORMLessonStatus.FAILED,
            SCORMLessonStatus.PASSED,
        ].includes(status.toLowerCase());
    },

    getTagsGroups(groupsID) {
        return new Promise(async (resolve, reject) => {
            try {
                const groups = groupsID;
                const tagsTemp = [];
                const tags = [];

                for (const p in groups) {
                    const group = await Group.findOne({
                        _id: { $eq: groups[p] },
                    });

                    if (group) {
                        tagsTemp.push(group.tags);
                    }
                }

                for (const p in tagsTemp) {
                    for (const i in tagsTemp[p]) {
                        tags.push(tagsTemp[p][i]);
                    }
                }

                resolve(tags);
            } catch (error) {
                reject(error);
            }
        });
    },

    calculateAverage(user) {
        return new Promise(async (resolve, reject) => {
            try {
                const evaluations = await HistoricEvaluation.find({
                    user: { $eq: user._id },
                });
                const trackings = await Tracking.find({
                    userLogin: { $eq: user.networkLogin },
                    kind: { $eq: 'SCORMTracking' },
                });

                const max = (evaluations.length + trackings.length) * 100;
                let total = 0;

                for (const e of evaluations) {
                    const rating = await calculateRatingEvaluation(
                        e.amountQuestionsCorrect,
                        e.amountOfQuestions
                    );
                    total += rating.values.correct;
                }

                for (const t of trackings) {
                    if (t.score) total += t.score;
                }

                resolve({
                    max,
                    total,
                    totalOfUsers: evaluations.length + trackings.length,
                });
            } catch (error) {
                reject(error);
            }
        });
    },

    handleStudentAverage(user) {
        return new Promise(async (resolve, reject) => {
            try {
                const evaluations = await HistoricEvaluation.find({
                    user: { $eq: user._id },
                });
                const trackings = await Tracking.find({
                    userLogin: { $eq: user.networkLogin },
                    kind: { $eq: 'ExamTracking' },
                });

                const max = (evaluations.length + trackings.length) * 100;
                let total = 0;

                for (const e of evaluations) {
                    const rating = await calculateRatingEvaluation(
                        e.amountQuestionsCorrect,
                        e.amountOfQuestions
                    );
                    total += rating.values.correct;
                }

                for (const t of trackings) {
                    if (t.score) total += t.score;
                }
                const average = Number(((total * 100) / max).toFixed(2));

                const highestScoreSorted = trackings.sort((prev, curr) => {
                    const prevScore = prev?.score ?? 0;
                    const currScore = curr?.score ?? 0;
                    return currScore - prevScore;
                });

                const highestScoreTrail = await Trail.findOne({
                    'items.itemID': highestScoreSorted[0].item,
                });

                resolve({ average, highestScoreTrail });
            } catch (error) {
                reject(error);
            }
        });
    },

    handleStudentTrails(user, trails) {
        return new Promise(async (resolve, reject) => {
            try {
                const completedTrails = [];
                const inProgressTrails = [];
                const allTrackingUser = await Tracking.find({
                    userLogin: { $eq: user.networkLogin },
                    $or: [
                        { expiredCompletion: { $exists: false } },
                        { expiredCompletion: { $eq: null } },
                    ],
                });
                for (const t of trails) {
                    const { trail } = module.exports.processTrailTracking(t, allTrackingUser);

                    if (trail.items.every(({ itemID }) => itemID?.completion === 1)) {
                        completedTrails.push(trail);
                    } else {
                        let nextItem;
                        const item = trail.items.find(({ itemID }) => !itemID?.completion);
                        if (item) {
                            foundItem = await Item.findById(item.itemID);
                            nextItem = {
                                _id: foundItem._id,
                                titleURL: foundItem.titleURL,
                            };
                        }

                        inProgressTrails.push({
                            _id: trail._id,
                            title: trail.title,
                            thumbPath: trail.thumbPath,
                            titleURL: trail.titleURL,
                            nextItem,
                        });
                    }
                }

                resolve({ completedTrails, inProgressTrails });
            } catch (error) {
                reject(error);
            }
        });
    },

    convertMinutesToHours(min) {
        return moment.utc().startOf('day').add(min, 'minutes').format('HH:mm');
    },

    duration(inputMilliseconds) {
        var hours;
        var minutes;
        var seconds;
        var i_inputMilliseconds = parseInt(inputMilliseconds, 10);
        var i_inputCentiseconds;
        var inputIsNegative = '';
        var rtnStr = '';

        // round to nearest 0.01 seconds
        i_inputCentiseconds = Math.round(i_inputMilliseconds / 10);

        if (i_inputCentiseconds < 0) {
            inputIsNegative = '-';
            i_inputCentiseconds = i_inputCentiseconds * -1;
        }

        hours = parseInt(i_inputCentiseconds / 360000, 10);
        minutes = parseInt((i_inputCentiseconds % 360000) / 6000, 10);
        seconds = ((i_inputCentiseconds % 360000) % 6000) / 100;

        rtnStr = inputIsNegative + 'PT';
        if (hours > 0) {
            rtnStr += hours + 'H';
        }

        if (minutes > 0) {
            rtnStr += minutes + 'M';
        }

        rtnStr += seconds + 'S';

        return rtnStr;
    },

    addHours(date) {
        return momentz(date).add(3, 'hours').format('YYYY-MM-DD hh:mm:ss');
    },

    checksIfTheEndDateIsLessThanTheStartDate(startDate, endDate) {
        if (endDate) {
            if (momentz(endDate).format('YYYY-MM-DD') < momentz(startDate).format('YYYY-MM-DD'))
                return false;
        }
        return true;
    },

    removeAccents(text) {
        if (!text) text = '';
        return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    },

    clearString(text) {
        return this.removeAccents(text)
            .replace(/[\])}[{(]/g, '')
            .split(' ')
            .join('_')
            .toUpperCase();
    },

    processTrailTracking(trail, allTrackingUser) {
        let containsACompletedItem = false;
        const completionDate = [];
        const scoreArr = [];
        let lastTrackingUpdate;

        for (const item of trail.items) {
            const objTracking = allTrackingUser.filter((obj) => {
                if (String(obj.item) === String(item?.itemID?._id)) {
                    return true;
                }
            })[0];
            lastTrackingUpdate = objTracking ? objTracking.updatedAt : null;
            const score = objTracking && objTracking.score ? objTracking.score : null;
            const completionAt = objTracking ? objTracking.completionAt : null;
            const updatedAt = objTracking ? objTracking.updatedAt : null;
            const createdAt = objTracking ? objTracking.createdAt : null;
            item.completionAt = completionAt;
            completionDate.push(completionAt);

            var tmpCompletion = null;
            if (objTracking) {
                if (
                    objTracking.kind === 'SCORMTracking' ||
                    objTracking.kind === 'ExamTracking' ||
                    objTracking.kind === 'ActivityTracking'
                ) {
                    if (
                        objTracking.lessonStatus === 'FAILED' ||
                        objTracking.lessonStatus === 'failed'
                    ) {
                        tmpCompletion = 2;
                    } else {
                        tmpCompletion = _isSCORMCompleted(objTracking.lessonStatus) ? 1 : 0;
                    }
                } else {
                    tmpCompletion = objTracking.completion;
                }
            }
            if (item.itemID?.passingScore && item.itemID.passingScore !== 0) {
                const kindsWithScore = ['ExamTracking', 'ActivityTracking'];
                if (objTracking && kindsWithScore.includes(objTracking.kind)) {
                    scoreArr.push(objTracking.score);
                }
            }

            if (item.itemID) {
                item.itemID.score = score;
                item.itemID.completionAt = completionAt;
                item.itemID.updatedAt = updatedAt;
                item.itemID.createdAt = createdAt;
                item.itemID.completion = tmpCompletion;
            }

            item.completion = tmpCompletion;
            if (item.completion === 1) {
                containsACompletedItem = true;
            }
        }

        let scoreAverage = 0;
        for (const score of scoreArr) {
            scoreAverage += score;
        }
        scoreAverage = scoreAverage / scoreArr.length;
        scoreAverage = Number(scoreAverage.toFixed(2));
        trail.scoreAverage = isNaN(scoreAverage) ? null : scoreAverage;

        var mostRecentDate = new Date(
            Math.max.apply(
                null,
                completionDate.map((e) => {
                    if (e !== null) return new Date(e);
                })
            )
        );
        trail.lastTrackingUpdate = lastTrackingUpdate;
        trail.completionAt = mostRecentDate;
        trail.completion = getTrailCompletion(trail);
        return { trail, containsACompletedItem };
    },

    processExpirationDate(trail, user) {
        const expirationType = trail.expirationType;
        const userCreationDate = new Date(user.createdAt).getTime();
        const trailReleaseDate = new Date(trail.startDate).getTime();
        if (expirationType && expirationType.type === 'availability') {
            const expirationDate =
                userCreationDate > trailReleaseDate ? userCreationDate : trailReleaseDate;
            const date = 1000 * 60 * 60 * 24 * expirationType.value + expirationDate;
            trail.expirationDate = new Date(date);
        } else if (expirationType && expirationType.type === 'fixed') {
            trail.expirationDate = new Date(expirationType.value);
        }
        return trail;
    },
    formatNumberCpf(value) {
        const cpfLength = 11;
        if (value.length < cpfLength) {
            for (let i = value.length; i < cpfLength; i++) {
                value = '0' + value;
            }
        }
        return value;
    },

    formatCnpj(value) {
        const formatValue = value.replace(/[^\w\s]/gi, '');
        return formatValue;
    },

    formatNumberRegistration(value) {
        const registrationLength = 6;
        if (value.length < registrationLength) {
            for (let i = value.length; i < registrationLength; i++) {
                value = '0' + value;
            }
        }
        return value;
    },

    isValidDate(date) {
        const d = new Date(date);
        return d instanceof Date && !isNaN(d);
    },

    findMostOccurringElements(arr, numElements) {
        const countMap = arr.reduce((countMap, element) => {
            countMap[element] = (countMap[element] || 0) + 1;
            return countMap;
        }, {});
        const countArray = Object.entries(countMap);
        countArray.sort((a, b) => b[1] - a[1]);
        const mostOccurringElements = countArray.slice(0, numElements);
        return mostOccurringElements.map(([element]) => element);
    },
};

function nameMonth(month) {
    const months = [
        'Janeiro',
        'Fevereiro',
        'Março',
        'Abril',
        'Maio',
        'Junho',
        'Julho',
        'Agosto',
        'Setembro',
        'Outubro',
        'Novembro',
        'Dezembro',
    ];
    return months[month - 1];
}

function calculateRatingEvaluation(amountQuestionsCorrect, amountOfQuestions) {
    return new Promise((resolve, reject) => {
        const result = {
            values: {
                correct: parseFloat(
                    ((amountQuestionsCorrect * 100) / amountOfQuestions).toFixed(2)
                ),
                incorrect: parseFloat(
                    (
                        ((amountOfQuestions - amountQuestionsCorrect) * 100) /
                        amountOfQuestions
                    ).toFixed(2)
                ),
            },
            questions: [],
        };

        resolve(result);
    });
}

function getTrailCompletion(trail) {
    const completed = trail.items.find((val) => val.completion === 1);
    const incomplete = trail.items.find(
        (val) =>
            (val.completion != null && val.completion >= 0 && val.completion < 1) ||
            val.completion == 2
    );
    const notAttempted = trail.items.find((val) => val.completion === null);
    if (incomplete) {
        return 0;
    } else if (completed && notAttempted) {
        return 0;
    } else if (completed && !incomplete && !notAttempted) {
        return 1;
    } else {
        return null;
    }
}

function _isSCORMCompleted(status = '') {
    return [
        SCORMLessonStatus.COMPLETED,
        SCORMLessonStatus.FAILED,
        SCORMLessonStatus.PASSED,
    ].includes(status.toLowerCase());
}
function returnMonthNumber(month) {
    switch (month) {
        case 'Jan':
            return '01';
        case 'Feb':
            return '02';
        case 'Mar':
            return '03';
        case 'Apr':
            return '04';
        case 'May':
            return '05';
        case 'Jun':
            return '06';
        case 'Jul':
            return '07';
        case 'Aug':
            return '08';
        case 'Sep':
            return '09';
        case 'Oct':
            return '10';
        case 'Nov':
            return '11';
        case 'Dec':
            return '12';
    }
}
