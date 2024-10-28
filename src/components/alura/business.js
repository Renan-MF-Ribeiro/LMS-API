const { AluraTracking } = require("../tracking/model");

module.exports = {
    async updateOneUserProgressTracking (tracking, item, userLogin) {
        const aluraTracking = {
            ...tracking,
            item,
            userLogin,
        }

        const trackingUpdated = await AluraTracking.findOneAndUpdate(
            { courseId: tracking.idCurso, userLogin },
            aluraTracking,
            { new: true, upsert: true }
        );

        return trackingUpdated;
    }
}
