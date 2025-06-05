const { GamificationEventLog, GAMIFICATION_LOG_STATUS } = require("./model");

const GamificationLogger = {
    async create(data) {
        try {
            const created = await GamificationEventLog.create({
                data,
                trace: {
                    oldStatus: null,
                    newStatus: GAMIFICATION_LOG_STATUS.PENDING,
                    changedAt: new Date(),
                },
            });

            return created;
        } catch (error) {
            console.log({ error });
            throw error;
        }
    },

    async update(logId, { status, data, error }) {
        try {
            const found = await GamificationEventLog.findById(logId).orFail();
            const updated = await GamificationEventLog.findOneAndUpdate(
                { _id: found._id },
                {
                    $set: {
                        ...(status && { status }),
                        ...(data && { data }),
                        ...(error && { error }),
                    },
                    $push: {
                        trace: {
                            oldStatus: found.status,
                            newStatus: status,
                            changedAt: new Date(),
                        },
                    },
                },
                { new: true }
            );

            return updated;
        } catch (error) {
            console.log({ error });
            throw error;
        }
    },
};

module.exports = GamificationLogger;
