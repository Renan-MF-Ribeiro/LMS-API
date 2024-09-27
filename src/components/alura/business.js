const { AluraTracking } = require("../tracking/model");

module.exports = {
    async updateOneUserProgressTracking (tracking, item, userLogin) {
        const aluraTracking = {
            item,
            userLogin,
            completion: tracking.percentualProgresso / 100,
            completionAt: tracking.percentualProgresso === 100 ? new Date() : null,
            progress: tracking.percentualProgresso,
            courseId: tracking.idCurso,
            lastAccess: tracking.ultimoAcesso,
            registrationDate: tracking.dataMatricula,
            lessonStatus: tracking.status
        }
        console.log(aluraTracking)
        const trackingUpdated = await AluraTracking.findOneAndUpdate(
            { courseId: tracking.idCurso, userLogin },
            aluraTracking,
            { new: true, upsert: true }
        );
        console.log(trackingUpdated);
        return trackingUpdated;
    }
}
