

const { Channel } = require("../components/channels/model");
const { Item } = require("../components/items/model");
const { getSectionTrailId } = require("../components/sections/business");
const { Section } = require("../components/sections/model");
const { Trail } = require("../components/trails/model");
const { runScript, generateReport } = require("./utils");

async function removeTaNaMaoCatalog() {
    const catalogoChannel = await Channel.findOne({ title: 'Catálogo' });

    console.log(`Found catalog channel: ${catalogoChannel._id} - ${catalogoChannel.title}`);

    const sectionsToRemove = await Section.find({
        _id: { $in: catalogoChannel.idSections },
        $or: [
            { defaultType: null },
            { defaultType: { $exists: false } }
        ]
    });

    console.log(`Found ${sectionsToRemove.length} sections to remove.`);

    const trailsIdsToRemove = sectionsToRemove.flatMap(
        (section) => section.trails
            ?.map(trail => getSectionTrailId(trail))
            .filter(Boolean)
    );

    const trailsToRemove = await Trail.find({ _id: { $in: trailsIdsToRemove } });

    console.log(`Found ${trailsToRemove.length} trails to remove.`);

    const itemsIdsToRemove = trailsToRemove.flatMap(
        (trail) => trail.items.map((item) => item.itemID)
    );

    const itemsToRemove = await Item.find({ _id: { $in: itemsIdsToRemove } });

    console.log(`Found ${itemsToRemove.length} items to remove.`);

    await Item.deleteMany({ _id: { $in: itemsToRemove.map(i => i._id) } });
    await Trail.deleteMany({ _id: { $in: trailsToRemove.map(t => t._id) } });
    await Section.deleteMany({ _id: { $in: sectionsToRemove.map(s => s._id) } });
    await Channel.deleteOne({ _id: catalogoChannel._id });

    process.exit(0);
}

runScript(removeTaNaMaoCatalog);