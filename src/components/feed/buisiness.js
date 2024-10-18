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

    // Busca o usuário correspondente pelo ID
    const user = await User.findOne({ _id: id }, '_id name profilePhoto').lean();

    // Adiciona o campo do usuário diretamente ao objeto original
    const populatedData = {
        ...data,
        [fieldName]: user,
        [reference]: undefined,
    };

    return populatedData;
}

module.exports = { populateUserFields, populateSingleUserFields };
