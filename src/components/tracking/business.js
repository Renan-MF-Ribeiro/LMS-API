const {
    Tracking,
    DocumentTracking,
    MediaTracking,
    AudioTracking,
    SCORMTracking,
    ExamTracking,
    SCORMTrackingHistory,
    SCORMLessonStatus,
    EventTracking,
} = require("./model");

const TRACKING_KINDS = Object.freeze({
    DocumentTracking: DocumentTracking,
    MediaTracking: MediaTracking,
    SCORMTracking: SCORMTracking,
    ExamTracking: ExamTracking,
    AudioTracking: AudioTracking,
    EventTracking: EventTracking,
});

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
}
