const { Group } = require('../groups/model');

async function handleUserEligibilitiesGamification(userGroupsAD) {
    const groupsAD = userGroupsAD.filter(
        (tag) => !String(tag).startsWith('PERFIL_')
    );
    const groups = await Group.find({ name: { $in: groupsAD }, deleted: 0 });
    const eligibilities = groups.map(({ name, tags }) => ({
        name,
        tags: tags.map(({ value }) => value),
    }));
    return eligibilities;
}

async function handleGroupTagsGamification(eligibilities) {
    const groups = await Group.find({ tags: { $in: eligibilities }, active: 1, deleted: 0 });
    const tags = eligibilities.map(({ value }) => value);
    const groupsTags = groups.map(({ name }) => ({ name, tags: [...new Set(tags)] }));
    return groupsTags
}

module.exports = { handleUserEligibilitiesGamification, handleGroupTagsGamification };
