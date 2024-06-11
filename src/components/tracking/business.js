const {
    DocumentTracking,
    MediaTracking,
    AudioTracking,
    SCORMTracking,
    ExamTracking,
    SCORMLessonStatus,
    EventTracking,
    FormTracking,
    ActivityTracking
} = require("./model");

const TRACKING_KINDS = Object.freeze({
    DocumentTracking: DocumentTracking,
    MediaTracking: MediaTracking,
    SCORMTracking: SCORMTracking,
    ExamTracking: ExamTracking,
    AudioTracking: AudioTracking,
    EventTracking: EventTracking,
    FormTracking: FormTracking,
    ActivityTracking: ActivityTracking,
});

const { HistoricEvaluation } = require('../assessments/model')

module.exports = {
    async createCompleteTracking (item, trackingType, networkLogin) {
        const _tracking = {
            item: item._id,
            userLogin: networkLogin,
            createdAt: new Date(),
            updatedAt: new Date(),
            completionAt: new Date(),
            lastState: '{}',
            sessionTime: 0,
            totalTime: 0,
        }
        let trackingToSave = {}
        if (
            trackingType === 'SCORMTracking' ||
            trackingType === 'ExamTracking'
        ) {
            trackingToSave = {
                ..._tracking,
                score: 0,
                lessonStatus: 'passed',
            }
        } else {
            trackingToSave = {
                ..._tracking,
                completion: 1,
            }
        }
        const TrackingModel = TRACKING_KINDS[trackingType]
        await TrackingModel.updateOne(
            { item: item._id, userLogin: networkLogin },
            trackingToSave,
            { upsert: true, omitUndefined: true },
        )
    },

    async processExamTracking (historic, passingScore, attempts, tracking) {

        const result = {
            remainingAttempts: 0,
            lessonStatus: SCORMLessonStatus.INCOMPLETE,
            completionAt: null,
            score: null
        }
        const score = parseFloat((historic.amountQuestionsCorrect * 100 / historic.amountOfQuestions).toFixed(2))
        const passed = score >= passingScore

        result.score = score

        if (passed) {
            result.lessonStatus = SCORMLessonStatus.PASSED
            await HistoricEvaluation.findByIdAndUpdate(historic._id, { lessonStatus: SCORMLessonStatus.PASSED })
        } else {
            if (
                attempts &&
                tracking.remainingAttempts
            ) {
                result.remainingAttempts = tracking.remainingAttempts - 1;
                result.lessonStatus = result.remainingAttempts
                    ? SCORMLessonStatus.INCOMPLETE
                    : SCORMLessonStatus.FAILED;

            } else if (!attempts) {
                result.lessonStatus = SCORMLessonStatus.INCOMPLETE
            } else {
                result.lessonStatus = SCORMLessonStatus.FAILED
            }

            await HistoricEvaluation.findByIdAndUpdate(historic._id, { lessonStatus: SCORMLessonStatus.FAILED })

        }
        if (result.lessonStatus == SCORMLessonStatus.PASSED ||
            result.lessonStatus == SCORMLessonStatus.FAILED) {
            result.completionAt = new Date()
        }
        await ExamTracking.findByIdAndUpdate(tracking._id, { ...result })
        return result
    }
}
