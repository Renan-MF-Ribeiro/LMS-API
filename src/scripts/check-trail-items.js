const { Trail } = require("../components/trails/model");
const { runScript } = require("./utils");

const { TINCAN_OWNER } = process.env;

const baseItemUrl = `http://happmobi.com.br/${TINCAN_OWNER}`;

async function run() {
    const trails = (
        await Trail.find({
           enabled: true
        })
            .select('_id title items')
            .lean()
    )

    for await (const trail of trails) {
        const wrongItems = trail.items.map(
            (item) => ({
                itemID: item.itemID,
                urlItem: item.urlItem,
                urlTrail: item.urlTrail,
                isUrlItemCorrect: !item.urlItem || item.urlItem.includes(String(trail._id)),
                isUrlTrailCorrect: !item.urlTrail || item.urlTrail.includes(String(trail._id)),
            })
        ).filter(item => !item.isUrlItemCorrect || !item.isUrlTrailCorrect);

        if(!wrongItems.length) continue;
        
        console.log(`\n\nTrail: ${trail._id} - ${trail.title}`);

        for await (const item of wrongItems) {
            const urlItem = `${baseItemUrl}/${trail._id}/${item.itemID}`;
            const urlTrail = `${baseItemUrl}/${trail._id}`;

            console.log(`\nItem: ${item.itemID}`);
            console.log(`URL Item: ${urlItem}`);
            console.log(`URL Trail: ${urlTrail}`);

            await Trail.updateOne(
                { _id: trail._id, 'items.itemID': item.itemID },
                {
                    $set: {
                        'items.$.urlItem': urlItem,
                        'items.$.urlTrail': urlTrail
                    }
                }
            );
        }
    }

    process.exit(0);
}

runScript(run);
