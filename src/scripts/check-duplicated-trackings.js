const { orderBy } = require("lodash");
const moment = require("moment");

const { runScript, generateReport, writeDebugJson } = require("./utils");

const environment = require("../environment");

const { Tracking } = require("../components/tracking/model");
// const { Item } = require("../components/items/model");

const REMOVE_DOCUMENTS = false;
const BATCH_SIZE = 100000;

const formatDate = (date) => moment(date).format('DD/MM/YYYY HH:mm:ss');

async function processBatch(batch, { from, to, batchIndex }) {
    const reportData = batch.map(dt => {
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

    const reportName = `${environment.CLIENT_ID}-duplicated-trackings-from-${moment(from).format('YYYYMMDD')}-to-${moment(to).format('YYYYMMDD')}-batch-${batchIndex}`;

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
            fileName: `${reportName}-report`,
        }
    )

    await writeDebugJson(
        `${reportName}-info`,
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

    if (REMOVE_DOCUMENTS) {
        console.time(`delete-batch-${batchIndex}`);

        const deleteIds = reportData.flatMap(r => r.documentsToRemove).map(d => d._id);

        console.log(`Deleting ${deleteIds.length} duplicated trackings from batch ${batchIndex}...`);

        await Tracking.deleteMany({ _id: { $in: deleteIds } });

        console.timeEnd(`delete-batch-${batchIndex}`);
    }
}

async function processByPeriod(from, to, items) {
    console.log(
        "\nChecking duplicated trackings from",
        moment(from).utc().format('DD/MM/YYYY'),
        "to",
        moment(to).utc().format('DD/MM/YYYY')
    );

    console.time("total");

    if (items?.length) console.log(`Limiting to ${items.length} items`);

    const conditional = {
        ...(items?.length && { item: { $in: items } }),
        createdAt: {
            $gte: from,
            $lte: to
        },
        $or: [
            { expiredCompletion: { $exists: false } },
            { expiredCompletion: { $eq: null } },
        ],
    };

    const totalTrackings = await Tracking.countDocuments(conditional);

    console.log(`Total trackings: ${totalTrackings}`);

    if (totalTrackings === 0) {
        console.log("No trackings found, skipping.");
        console.timeEnd("total");
        return;
    }

    console.time("aggregation");

    const duplicatedTrackings = await Tracking.aggregate([
        { $match: conditional },
        {
            $group: {
                _id: { item: "$item", userLogin: "$userLogin" },
                documents: { $push: "$$ROOT" },
                count: { $sum: 1 }
            }
        },
        { $match: { count: { $gt: 1 } } },
    ]);

    console.timeEnd("aggregation");

    console.log(`Found ${duplicatedTrackings.length} duplicated trackings.`);

    if (duplicatedTrackings.length === 0) {
        console.log("No duplicated trackings found, skipping.");
        console.timeEnd("total");
        return;
    }

    const trackingsWillBeDeleted = duplicatedTrackings.reduce((acc, dt) => acc + (dt.count - 1), 0);

    console.log(`A total of ${trackingsWillBeDeleted} duplicated trackings will be removed.`);

    console.time("report");

    let batchIndex = 0;
    const totalBatches = Math.ceil(duplicatedTrackings.length / BATCH_SIZE);

    for (let i = 0; i < duplicatedTrackings.length; i += BATCH_SIZE) {
        const batch = duplicatedTrackings.slice(i, i + BATCH_SIZE);
        batchIndex++;

        console.log(`Processing batch ${batchIndex}/${totalBatches} (${batch.length} duplicated trackings)...`);

        console.time(`batch-${batchIndex}`);

        await processBatch(batch, { from, to, batchIndex });

        console.timeEnd(`batch-${batchIndex}`);
    }

    console.log("Done");
    console.timeEnd("total");
}

async function checkForDuplicatedTrackings() {
    const startDate = moment('2019-01-01').startOf('day');
    const endDate = moment().endOf('day');
    const period = 10;
    const periodType = 'years';
    const periodArray = [];

    console.log('It will remove duplicated trackings?', REMOVE_DOCUMENTS);

    let currentStart = startDate.clone();

    while (currentStart.isBefore(endDate)) {
        const currentEnd = moment.min(
            currentStart
                .clone()
                .add(period, periodType)
                .subtract(1, 'day')
                .endOf('day'),
            endDate
        );

        periodArray.push({
            from: currentStart.clone().utc(true).toDate(),
            to: currentEnd.clone().utc(true).toDate()
        });

        currentStart = currentEnd.clone().add(1, 'day').startOf('day');
    }

    console.log(periodArray.length, 'periods to process:');

    // const validItems = await Item.find({
    //     enabled: true
    // }).select('_id').lean();

    for await (const period of periodArray) {
        await processByPeriod(
            period.from,
            period.to,
            // validItems.map(i => i._id)
        );
    }

    process.exit(0);
}

runScript(checkForDuplicatedTrackings);