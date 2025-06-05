const { groupBy, orderBy } = require("lodash");
const { Types } = require("mongoose");
const { HistoricEvaluation } = require("../components/assessments/model");
const { runScript, writeDebugJson } = require("./utils");
const { Tracking } = require("../components/tracking/model");
const { User } = require("../components/users/model");

async function fetchUserEvaluationsHistory() {
    // Busca todos os usuários distintos que possuem avaliações
    const userIds = await HistoricEvaluation.distinct('user');

    console.log(`Total de usuários com avaliações: ${userIds.length}`);

    const userEvaluationHistory = [];

    const batchSize = 2000;

    for (let batchStart = 0; batchStart < userIds.length; batchStart += batchSize) {
        const batchUserIds = userIds.slice(batchStart, batchStart + batchSize);

        const percentage = Math.round((batchStart / userIds.length) * 100);

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
                    const orderedEvaluations = orderBy(evaluations, ['createdAt'], ['desc']);

                    const hasPassedEvaluation = orderedEvaluations.some(evaluation => evaluation.lessonStatus === 'passed');

                    const isPassedEvaluationTheMostRecent = orderedEvaluations[0]?.lessonStatus === 'passed';

                    if (!hasPassedEvaluation || isPassedEvaluationTheMostRecent) { return null; }

                    return {
                        itemId,
                        evaluations: orderedEvaluations.map(evaluation => ({
                            ...evaluation.toObject(),
                            score: (evaluation.amountQuestionsCorrect / evaluation.amountOfQuestions) * 100,
                        })),
                        isPassedEvaluationTheMostRecent,
                    };
                })
                .filter(Boolean)

            if (historic.length > 0) {
                userEvaluationHistory.push({ userId, historic });
            }
        }
    }

    console.log("\n");

    return userEvaluationHistory;
}

async function setUserAndTrackingToEvaluations(userEvaluationHistory) {
    const usersIds = userEvaluationHistory.map(item => item.userId);

    const batchSize = 100;

    for (let batchStart = 0; batchStart < usersIds.length; batchStart += batchSize) {
        const percentage = Math.round((batchStart / usersIds.length) * 100);

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

    console.log("\n");
}

async function checkAndNormalizeEvaluations() {
    const userEvaluationHistory = await fetchUserEvaluationsHistory();

    await setUserAndTrackingToEvaluations(userEvaluationHistory);

    console.log(`Total de usuários com avaliações para serem normalizadas: ${userEvaluationHistory.length}`);

    console.log(`Total de avaliações a serem normalizadas: ${userEvaluationHistory.reduce((acc, item) => acc + item.historic.length, 0)}`);

    await writeDebugJson('evaluations-to-normalize', userEvaluationHistory);

    process.exit(0);
}

runScript(checkAndNormalizeEvaluations);