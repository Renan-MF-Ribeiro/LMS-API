
const { Tracking } = require("../components/tracking/model");
const { runScript } = require("./utils");

async function run() {
    const duplicatedTrackings = await Tracking.aggregate([
        {
            $group: {
                _id: { userLogin: "$userLogin", item: "$item" },
                count: { $sum: 1 },
                trackingIds: { $push: "$_id" } // Aqui você adiciona o ID de cada item duplicado
            }
        },
        {
            $match: {
                count: { $gt: 1 }
            }
        }
    ]);

    const trackingsToDelete = [];


    for await (info of duplicatedTrackings) {
        const { _id, count, trackingIds } = info;

        console.log(`\n\nDuplicated trackings for user ${_id.userLogin} and item ${_id.item}: ${count}`);

        const lastTrackingId = trackingIds.pop();

        console.log(`Keeping tracking ${lastTrackingId}`);

        trackingsToDelete.push(...trackingIds);
    }

    const batchSize = 5000;
    const total = trackingsToDelete.length;

    for (let i = 0; i < total; i += batchSize) {
        console.log(`Deleting trackings ${i} to ${i + batchSize}`);
        const batch = trackingsToDelete.slice(i, i + batchSize);

        await Tracking.deleteMany({ _id: { $in: batch } });
    }

    process.exit(0);
}

runScript(run);