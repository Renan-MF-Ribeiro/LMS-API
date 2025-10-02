const { orderBy } = require("lodash");
const { Tracking } = require("../components/tracking/model");
const moment = require("moment");

const { runScript, generateReport, writeDebugJson } = require("./utils");
const environment = require("../environment");

const REMOVE_DOCUMENTS = false;

const formatDate = (date) => moment(date).format('DD/MM/YYYY HH:mm:ss');

async function run() {
    console.log("Checking duplicated trackings...");

    console.time("total");

    const totalTrackings = await Tracking.countDocuments({
        $or: [
            { expiredCompletion: { $exists: false } },
            { expiredCompletion: { $eq: null } },
        ],
    });

    console.log(`Total trackings: ${totalTrackings}`);

    console.time("aggregation");

    const duplicatedTrackings = await Tracking.aggregate([
        {
            $match: {
                $or: [
                    { expiredCompletion: { $exists: false } },
                    { expiredCompletion: { $eq: null } },
                ],
            }
        },
        {
            $group: {
                _id: { item: "$item", userLogin: "$userLogin" },
                documents: { $push: "$$ROOT" },
                count: { $sum: 1 }
            }
        },
        {
            $match: { count: { $gt: 1 } }
        }
    ]);

    console.timeEnd("aggregation");

    console.log(`Found ${duplicatedTrackings.length} duplicated trackings.`);

    console.time("report");

    const reportData = duplicatedTrackings.map(dt => {
        const orderedTrackings = orderBy(
            dt.documents,
            [
                // First, keep completed ones first
                doc => doc.completionAt ? 1 : 0,
                // Then, order by completion date)
                (doc) => doc.completionAt ? moment(doc.completionAt).valueOf() : 0,
                // Then, order by creation date
                (doc) => moment(doc.updatedAt).valueOf()
            ],
            [
                'desc', // Completed first
                'asc', // Earliest completion date first
                'desc' // Latest updated date first
            ]
        );

        const mostRecent = orderedTrackings.shift();

        return {
            item: dt._id.item,
            userLogin: dt._id.userLogin,
            count: dt.count,
            mostRecentId: mostRecent._id,
            mostRecentCompletionAt: mostRecent.completionAt ? formatDate(mostRecent.completionAt) : '',
            mostRecentUpdatedAt: formatDate(mostRecent.updatedAt),
            mostRecentCreatedAt: formatDate(mostRecent.createdAt),
            documentsToRemoveIds: orderedTrackings.map(d => d._id).join(", "),
            documentsToRemoveCompletionAt: orderedTrackings.map(d => d.completionAt ? formatDate(d.completionAt) : 'not completed').join(", "),
            documentsToRemoveUpdatedAt: orderedTrackings.map(d => formatDate(d.updatedAt)).join(", "),
            documentsToRemoveCreatedAt: orderedTrackings.map(d => formatDate(d.createdAt)).join(", "),
            mostRecent,
            documentsToRemove: orderedTrackings,
        };
    });

    await generateReport(
        reportData,
        [
            { header: 'Item', key: 'item' },
            { header: 'User Login', key: 'userLogin' },
            { header: 'Count', key: 'count' },
            { header: 'Most Recent Tracking', key: 'mostRecentId' },
            { header: 'Most Recent CompletionAt', key: 'mostRecentCompletionAt' },
            { header: 'Most Recent UpdatedAt', key: 'mostRecentUpdatedAt' },
            { header: 'Most Recent CreatedAt', key: 'mostRecentCreatedAt' },
            { header: 'Trackings To Remove', key: 'documentsToRemoveIds' },
            { header: 'Trackings To Remove CompletionAt', key: 'documentsToRemoveCompletionAt' },
            { header: 'Trackings To Remove UpdatedAt', key: 'documentsToRemoveUpdatedAt' },
            { header: 'Trackings To Remove CreatedAt', key: 'documentsToRemoveCreatedAt' },
        ],
        {
            fileName: `${environment.CLIENT_ID}-duplicated-trackings-report`,
        }
    )

    await writeDebugJson(
        `${environment.CLIENT_ID}-duplicated-trackings-info`,
        reportData.map(
            info => ({
                item: info.item,
                userLogin: info.userLogin,
                count: info.count,
                mostRecent: info.mostRecent,
                documentsToRemove: info.documentsToRemove,
            })
        )
    );

    console.timeEnd("report");

    if (REMOVE_DOCUMENTS) {
        console.time('delete');

        const deleteIds = reportData.flatMap(r => r.documentsToRemove).map(d => d._id);

        console.log(`Deleting ${deleteIds.length} duplicated trackings...`);

        await Tracking.deleteMany({ _id: { $in: deleteIds } });

        console.timeEnd("delete");
    }

    console.log("Done");
    console.timeEnd("total");

    process.exit(0);
}

runScript(run);