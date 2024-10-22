const { Trail } = require('../trails/model');
const { User } = require('../users/model');

async function populateUserFields(fieldName, reference, data) {
    const ids = [...new Set(data?.data?.map((x) => x[reference]))];
    const users = await User.find({ _id: { $in: ids } }, '_id name profilePhoto').lean();

    const userMap = Object.fromEntries(users.map((user) => [user._id.toString(), user]));

    const populatedData = data.data.map((group) => ({
        [fieldName]: userMap[group[reference]],
        ...group,
        [reference]: undefined,
    }));

    return populatedData;
}
async function populateSingleUserFields(fieldName, reference, data) {
    const id = data[reference];
    const user = await User.findOne({ _id: id }, '_id name profilePhoto').lean();

    const populatedData = {
        ...data,
        [fieldName]: user,
        [reference]: undefined,
    };

    return populatedData;
}
async function populateTrailFields(data) {
    const trails = await Trail.findOne({ _id: { $in: data } }, 'title titleURL thumbPath').lean();

    return trails;
}

module.exports = { populateUserFields, populateSingleUserFields, populateTrailFields };
