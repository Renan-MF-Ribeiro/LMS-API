const { Channel } = require("../components/channels/model");
const { CourseModel } = require("../components/courses/model");
const { Group } = require("../components/groups/model");
const { Trail } = require("../components/trails/model");
const environment = require("../environment");

const { runScript, generateReport } = require("./utils");

const EXECUTE_DELETE = false;

async function deleteUnusedGroups() {
    const trailsTags = await Trail.aggregate([
        { $unwind: "$tags" },
        { $project: { tag: "$tags.value" } },
        { $group: { _id: "$tag", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { _id: 0, tag: "$_id", count: 1 } },
    ]);

    console.log('Tags nas trilhas:');
    console.table(trailsTags);

    await generateReport(
        trailsTags,
        [
            { header: 'Tag', key: 'tag' },
            { header: 'Count', key: 'count' }
        ],
        { fileName: `${environment.CLIENT_ID}-tags-nas-trilhas` }
    );

    const coursesTags = await CourseModel.aggregate([
        { $unwind: "$tags" },
        { $project: { tag: "$tags.value" } },
        { $group: { _id: "$tag", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { _id: 0, tag: "$_id", count: 1 } },
    ]);

    console.log('Tags nos cursos:');
    console.table(coursesTags);

    await generateReport(
        coursesTags,
        [
            { header: 'Tag', key: 'tag' },
            { header: 'Count', key: 'count' }
        ],
        { fileName: `${environment.CLIENT_ID}-tags-nos-cursos` }
    );

    const channelsTags = await Channel.aggregate([
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { _id: 0, tag: "$_id", count: 1 } },
    ]);

    console.log('Tags nos canais:');
    console.table(channelsTags);

    await generateReport(
        channelsTags,
        [
            { header: 'Tag', key: 'tag' },
            { header: 'Count', key: 'count' }
        ],
        { fileName: `${environment.CLIENT_ID}-tags-nos-canais` }
    );

    const allTags = trailsTags
        .map(tag => tag.tag)
        .concat(coursesTags.map(tag => tag.tag))
        .concat(channelsTags.map(tag => tag.tag));

    const uniqueTags = [...new Set(allTags)];

    console.log('Tags únicas:', uniqueTags.length);
    console.table(uniqueTags);

    const usedGroups = await Group.find({
        'tags.value': { $in: uniqueTags }
    }).lean();

    console.log(`Grupos em uso`, usedGroups.length);
    console.table(usedGroups, ['name']);

    const groupTags = await Group.aggregate([
        { $unwind: "$tags" },
        { $project: { tag: "$tags.value", name: "$name" } },
        { $group: { _id: "$tag", count: { $sum: 1 }, groups: { $addToSet: "$name" } } },
        { $sort: { count: -1 } },
        { $project: { _id: 0, tag: "$_id", count: 1, groups: 1 } },
    ]);

    console.log('Tags nos grupos:', groupTags.length);

    const unusedTags = groupTags.filter(groupTag => !uniqueTags.includes(groupTag.tag));

    console.log('Tags não utilizadas:', unusedTags.length);

    await generateReport(
        unusedTags,
        [
            { header: 'Tag', key: 'tag' },
            { header: 'Count', key: 'count' },
            { header: 'Groups', key: 'groups' }
        ],
        { fileName: `${environment.CLIENT_ID}-tags-nao-utilizadas` }
    );

    console.log(unusedTags[0]);

    if (EXECUTE_DELETE) {
        console.log('Iniciando remoção de tags não utilizadas dos grupos...');

        for await (const [index, unusedTag] of Object.entries(unusedTags)) {
            process.stdout.write(`Processando tag ${index} / ${unusedTags.length}\r`);

            await Group.updateMany(
                { name: { $in: unusedTag.groups } },
                { $pull: { tags: { value: unusedTag.tag } } }
            )
        }
    }

    process.exit(0);
}

runScript(deleteUnusedGroups);