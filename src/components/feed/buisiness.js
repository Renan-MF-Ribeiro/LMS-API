const { User } = require("../users/model");

// utils/populatePosts.js
async function populatePostsWithComments(field, data) {
    const ids = [...new Set(data.data.map((x) => x.ownerId))];
    const users = await User.find({ _id: { $in: ids } }, '_id name profilePhoto').lean();

    const userMap = Object.fromEntries(users.map((user) => [user._id.toString(), user]));

    const populatedData = data.data.map((group) => ({
        ...group,
        [field]: userMap[group.ownerId],
    }));

    return populatedData
}

module.exports = { populatePostsWithComments };
