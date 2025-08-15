const { groupBy, orderBy } = require("lodash");
const { Types } = require("mongoose");
const { HistoricEvaluation } = require("../components/assessments/model");
const { runScript, writeDebugJson, generateReport } = require("./utils");
const { Tracking } = require("../components/tracking/model");
const { User } = require("../components/users/model");

const NORMALIZE_DATA = false;

async function fetchUserEvaluationsHistory() {
    // Busca todos os usuários distintos que possuem avaliações
    const userIds = await HistoricEvaluation.distinct('user');

    console.log(`Total de usuários com avaliações: ${userIds.length}`);

    const userEvaluationHistory = [];

    const batchSize = 2000;

    for (let batchStart = 0; batchStart < userIds.length; batchStart += batchSize) {
        const batchUserIds = userIds.slice(batchStart, batchStart + batchSize);

        const percentage = Math.min(100, Math.round(((batchStart + batchSize) / userIds.length) * 100));

        process.stdout.write(`\rProcessando históricos: ${percentage}%`);

        // Busca todas as avaliações dos usuários do batch
        const batchEvaluations = await HistoricEvaluation
            .find({ user: { $in: batchUserIds } })
            .select('_id user item lessonStatus createdAt amountQuestionsAnswered amountQuestionsCorrect amountOfQuestions');

        if (!batchEvaluations.length) continue;

        // Agrupa avaliações por usuário
        const evaluationsByUser = groupBy(batchEvaluations, 'user');

        for (const userId of batchUserIds) {
            const userEvaluations = evaluationsByUser[userId] || [];

            if (!userEvaluations.length) continue;

            const evaluationsGroupedByItem = groupBy(userEvaluations, 'item');

            const historic = Object.entries(evaluationsGroupedByItem)
                .map(([itemId, evaluations]) => {
                    const orderedEvaluations = orderBy(evaluations, ['createdAt'], ['asc']);

                    const oldestPassedEvaluation = orderedEvaluations.find(evaluation => evaluation.lessonStatus === 'passed');

                    const isPassedEvaluationTheOldest = orderedEvaluations[0]?.lessonStatus === 'passed';

                    if (orderedEvaluations.length <= 1 || !oldestPassedEvaluation || !isPassedEvaluationTheOldest) { return null; }

                    return {
                        itemId,
                        evaluations: orderedEvaluations.map(evaluation => ({
                            ...evaluation.toObject(),
                            score: (evaluation.amountQuestionsCorrect / evaluation.amountOfQuestions) * 100,
                        })),
                        isPassedEvaluationTheOldest,
                        oldestPassedDate: oldestPassedEvaluation.createdAt,
                        oldestPassedScore: (oldestPassedEvaluation.amountQuestionsCorrect / oldestPassedEvaluation.amountOfQuestions) * 100,
                    };
                })
                .filter(Boolean)

            if (historic.length > 0) {
                userEvaluationHistory.push({ userId, historic });
            }
        }
    }

    process.stdout.write('\r\n');

    return userEvaluationHistory;
}

async function setUserAndTrackingToEvaluations(userEvaluationHistory) {
    const usersIds = userEvaluationHistory.map(item => item.userId);

    const batchSize = 500;

    for (let batchStart = 0; batchStart < usersIds.length; batchStart += batchSize) {
        const processedUsers = Math.min(batchStart + batchSize, usersIds.length);
        const percentage = Math.round((processedUsers / usersIds.length) * 100);

        process.stdout.write(`\rProcessando trackings: ${percentage}%`);

        const batchUserIds = usersIds.slice(batchStart, batchStart + batchSize);

        const batchUsers = await User.find({ _id: { $in: batchUserIds } })
            .select('_id networkLogin');

        const batchItemsId = userEvaluationHistory
            .filter(item => batchUserIds.includes(item.userId))
            .flatMap(item => item.historic.map(h => new Types.ObjectId(h.itemId)));

        const batchTrackings = await Tracking.find({
            userLogin: { $in: batchUsers.map(u => u.networkLogin) },
            item: { $in: batchItemsId },
        }).sort({ createdAt: -1 }).select('_id item userLogin lessonStatus score completionAt completion createdAt');

        for (const user of batchUsers) {
            const userEvaluations = userEvaluationHistory.find(item => String(item.userId) === String(user._id));

            if (userEvaluations) {
                userEvaluations.networkLogin = user.networkLogin;

                const userTrackings = batchTrackings.filter(t => t.userLogin === user.networkLogin);

                for (const historic of userEvaluations.historic) {
                    const historicTracking = userTrackings.find(t => String(t.item) === String(historic.itemId));

                    historic.tracking = historicTracking || null;
                }
            }
        }
    }

    process.stdout.write('\r\n');

    return userEvaluationHistory;
}

async function normalizeEvaluations(reallyNeedToNormalize) {
    console.log('Normalizando avaliações...');

    const results = [];

    for (const userInfo of reallyNeedToNormalize) {
        for (const historic of userInfo.historic) {
            if (!historic.isPassedEvaluationTheOldest || historic.tracking?.lessonStatus === 'passed') continue;

            results.push({
                userId: userInfo.userId,
                userNetworkLogin: userInfo.networkLogin,
                itemId: historic.itemId,
                oldestPassedDate: historic.oldestPassedDate,
                oldestPassedScore: historic.oldestPassedScore,
                trackingId: historic.tracking?._id,
                currentTrackingStatus: historic.tracking?.lessonStatus,
                currentTrackingCompletionAt: historic.tracking?.completionAt || null,
                currentTrackingScore: historic.tracking?.score || 0,
            });

            if (NORMALIZE_DATA) {
                await Tracking.updateOne(
                    { _id: new Types.ObjectId(historic.tracking._id) },
                    {
                        $set: {
                            lessonStatus: 'passed',
                            completion: true,
                            completionAt: historic.oldestPassedDate,
                            score: historic.oldestPassedScore,
                        }
                    }
                );
            }
        }
    }

    console.log('Avaliações normalizadas com sucesso!');

    return results;
}

async function checkAndNormalizeEvaluations() {
    const userEvaluationHistory = await fetchUserEvaluationsHistory();

    console.log(`Total de usuários com avaliações para serem normalizadas: ${userEvaluationHistory.length}`);

    await setUserAndTrackingToEvaluations(userEvaluationHistory);

    console.log('Criando report...');

    await writeDebugJson('evaluations-to-normalize', userEvaluationHistory);

    const usersWithEvaluationsToNormalize = userEvaluationHistory.map(info => {
        return {
            ...info,
            historic: info.historic.filter(h => {
                return h.isPassedEvaluationTheOldest && h.tracking?.lessonStatus !== 'passed';
            })
        }
    }).filter(info => info.historic.length > 0);

    console.log(`Total de avaliações a serem normalizadas: ${usersWithEvaluationsToNormalize.length}`);

    await writeDebugJson('evaluations-to-normalize-really', usersWithEvaluationsToNormalize);

    const results = await normalizeEvaluations(usersWithEvaluationsToNormalize);

    await generateReport(
        results,
        [
            { header: 'User ID', key: 'userId' },
            { header: 'User Network Login', key: 'userNetworkLogin' },
            { header: 'Item ID', key: 'itemId' },
            { header: 'Tracking ID', key: 'trackingId' },
            { header: 'Current Tracking Status', key: 'currentTrackingStatus' },
            { header: 'Current Tracking Completion At', key: 'currentTrackingCompletionAt' },
            { header: 'Current Tracking Score', key: 'currentTrackingScore' },
            { header: 'Oldest Passed Date', key: 'oldestPassedDate' },
            { header: 'Oldest Passed Score', key: 'oldestPassedScore' },
        ],
        { fileName: 'evaluations-to-normalize-report' }
    );

    process.exit(0);
}

runScript(checkAndNormalizeEvaluations);