const { Channel } = require("../components/channels/model");
const { CourseModel } = require("../components/courses/model");
const { Group } = require("../components/groups/model");
const { Trail } = require("../components/trails/model");
const { User } = require("../components/users/model");
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

    const groups = await Group.aggregate([
        { $match: { 'tags.value': { $in: allTags } } },
        { $unwind: '$tags' },
        { $group: { _id: '$name', tags: { $addToSet: '$tags.value' }, docs: { $addToSet: '$_id' } } },
        {
            $project: {
                _id: 0,
                name: '$_id',
                tags: 1,
                docs: 1,
            },
        }
    ]);

    console.log('Grupos relacionados às tags:');
    console.table(groups, ['name', 'tags']);

    await generateReport(
        groups,
        [
            { header: 'Name', key: 'name' },
            { header: 'Tags', key: 'tags' }
        ],
        { fileName: `${environment.CLIENT_ID}-grupos-relacionados-as-tags` }
    );

    const duplicatedGroups = groups.filter(g => g.docs.length > 1);

    const groupDeletionInfo = duplicatedGroups.map(g => {
        const docs = g.docs;
        const groupToKeep = docs.shift();

        return {
            name: g.name,
            groupToKeep,
            groupsToDelete: docs,
        };
    });

    const groupDeletionInfoTags = await Group.aggregate([
        { $match: { name: { $in: duplicatedGroups.map(g => g.name) } } },
        { $unwind: '$tags' },
        { $group: { _id: '$name', tags: { $addToSet: '$tags.value' } } },
        {
            $project: {
                _id: 0,
                name: '$_id',
                tags: 1,
            },
        }
    ])

    const duplicatedToDelete = groupDeletionInfoTags.map(({ name, tags }) => {
        const groupInfo = groupDeletionInfo.find(g => g.name === name);

        return {
            ...groupInfo,
            tags,
        };
    });

    if (duplicatedToDelete.length > 0) {
        console.log('Grupos duplicados:');
        console.table(duplicatedToDelete, ['name', 'groupToKeep', 'groupsToDelete', 'tags']);

        await generateReport(
            duplicatedToDelete,
            [
                { header: 'Name', key: 'name' },
                { header: 'Group To Keep', key: 'groupToKeep' },
                { header: 'Groups To Delete', key: 'groupsToDelete' },
                { header: 'Tags', key: 'tags' }
            ],
            { fileName: `${environment.CLIENT_ID}-grupos-duplicados` }
        );

    }

    const totalGroups = await Group.countDocuments();
    console.log(`Total de grupos: ${totalGroups}`);

    const groupsToDelete = await Group.find({
        $or: [
            { _id: { $in: duplicatedToDelete.flatMap(g => g.groupsToDelete) } },
            { name: { $nin: groups.map(g => g.name) } }
        ]
    }).lean();

    await generateReport(
        groupsToDelete,
        [
            { header: 'Name', key: 'name' },
            { header: 'Tags', key: 'tags' }
        ],
        { fileName: `${environment.CLIENT_ID}-grupos-deletados` }
    );

    console.log(`Total de grupos a serem deletados: ${groupsToDelete.length}`);

    if (EXECUTE_DELETE) {
        await Group.deleteMany({ _id: { $in: groupsToDelete.map(g => g._id) } });

        if (duplicatedToDelete.length > 0) {
            for (const groupInfo of duplicatedToDelete) {
                await Group.updateOne(
                    { _id: groupInfo.groupToKeep },
                    { $set: { tags: groupInfo.tags.map(t => ({ display: t, value: t })) } }
                );
            }
        }
    }

    const deletedGroupsNameWithoutProfiles = groupsToDelete
        .filter(g => !g.name.toLowerCase().startsWith('perfil_'))
        .map(g => g.name);

    const usersWithDeletedGroups = await User.find({
        groupsAD: { $in: deletedGroupsNameWithoutProfiles }
    }).select('_id name networkLogin groupsAD').lean();

    await generateReport(
        usersWithDeletedGroups,
        [
            { header: 'ID', key: '_id' },
            { header: 'Name', key: 'name' },
            { header: 'Login', key: 'networkLogin' },
            { header: 'GroupsAD', key: 'groupsAD' },
        ],
        { fileName: `${environment.CLIENT_ID}-usuarios-afetados-com-grupos-deletados` }
    )

    console.log(`Total de usuários afetados com grupos a serem deletados: ${usersWithDeletedGroups.length}`);

    if (EXECUTE_DELETE) {
        await User.updateMany(
            { _id: { $in: usersWithDeletedGroups.map(u => u._id) } },
            { $pull: { groupsAD: { $in: deletedGroupsNameWithoutProfiles.map(g => g.name) } } }
        );
    }

    process.exit(0);
}

runScript(deleteUnusedGroups);