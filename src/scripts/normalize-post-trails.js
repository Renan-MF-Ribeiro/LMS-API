const { uniqBy } = require("lodash");
const { Item } = require("../components/items/model");
const { Trail } = require("../components/trails/model");
const { runScript, generateReport } = require("./utils");

async function normalizePostTrails() {
    const trails = await Trail
        .find({ post: true })
        .populate({
            path: "items.itemID",
            model: Item
        })
        .lean()

    const errors = [];
    const corrects = [];

    console.log('Total post trails:', trails.length);

    for await (const trail of trails) {
        const uniqueItems = uniqBy(trail.items, (info) => String(info.itemID._id));

        const itemsLength = uniqueItems.length;
        const postItems = uniqueItems.filter(item => item.itemID.kind === 'PostItem');
        const hasPostItem = postItems.length > 0;
        const postItemsTitles = postItems.map(i => i.itemID.title).join(', ');

        if (itemsLength && !hasPostItem) {
            errors.push({
                ...trail,
                hasPostItem,
                itemsLength,
                postItemsLength: postItems.length,
                postItemsTitles,
            });
        }
        else {
            corrects.push({
                ...trail,
                hasPostItem,
                itemsLength,
                postItemsLength: postItems.length,
                postItemsTitles,
            });
        }
    }

    console.log('Total correct trails:', corrects.length);
    console.log('Total error trails:', errors.length);

    await Trail.updateMany(
        { _id: { $in: errors.map(c => c._id) } },
        { $set: { post: false } }
    );

    const sheetFields = [
        { header: 'Title', key: 'title' },
        { header: 'Quantity of Items', key: 'itemsLength' },
        { header: 'Quantity of Post Items', key: 'postItemsLength' },
        { header: 'Has Post Item', key: 'hasPostItem' },
        { header: 'Post Items', key: 'postItemsTitles' },
    ];

    await generateReport(
        errors,
        sheetFields,
        { fileName: 'normalize-post-trails-errors' }
    );

    await generateReport(
        corrects,
        sheetFields,
        { fileName: 'normalize-post-trails-corrects' }
    );

    process.exit(0);
}

runScript(normalizePostTrails);