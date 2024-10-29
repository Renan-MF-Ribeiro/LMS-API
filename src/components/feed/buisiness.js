const { Trail } = require('../trails/model');
const { User } = require('../users/model');

async function populateUserFields(fieldName, reference, data) {
    const isArray = Array.isArray(data.data);
    const ids = isArray
        ? [...new Set(data.data.map((x) => x[reference]).filter(Boolean))]
        : [data[reference]];
    const users = await User.find({ _id: { $in: ids } }, '_id name profilePhoto').lean();
    const userMap = Object.fromEntries(users.map((user) => [user._id.toString(), user]));
    
    const populate = (item) => ({
        [fieldName]: userMap[item[reference]],
        ...item,
        [reference]: undefined
    });

    return isArray ? data.data.map(populate) : populate(data);
}

async function populateMembers(data) {
    const ids = data.data;

    const users = await User.find({ _id: { $in: ids } }, '_id name profilePhoto').lean();

    return users;
}

async function populateTrailFields(data) {
    const trails = await Trail.findOne({ _id: { $in: data } }, 'title titleURL thumbPath').lean();

    return trails || undefined;
}

module.exports = { populateUserFields, populateTrailFields, populateMembers };
