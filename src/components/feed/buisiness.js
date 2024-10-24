const { Trail } = require('../trails/model');
const { User } = require('../users/model');

async function populateUserFields(fieldName, reference, data) {

    const isArray = Array.isArray(data);
    const ids = isArray ? [...new Set(data.map((x) => x[reference]))] : [data[reference]];

    const users = await User.find({ _id: { $in: ids } }, '_id name profilePhoto').lean();
    const userMap = Object.fromEntries(users.map((user) => [user._id.toString(), user]));

    const populate = (item) => ({
        ...item,
        [fieldName]: userMap[item[reference]],
        [reference]: undefined,
    });

    return isArray ? data.map(populate) : populate(data);
}

async function populateTrailFields(data) {
    const trails = await Trail.findOne({ _id: { $in: data } }, 'title titleURL thumbPath').lean();

    return trails;
}

module.exports = { populateUserFields, populateTrailFields };
