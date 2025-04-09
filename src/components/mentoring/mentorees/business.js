const { Trail } = require('../../trails/model');
const { User } = require('../../users/model');

async function populateTrailFields(data) {
    const trails = await Trail.findOne({ _id: { $in: data } }, 'title titleURL thumbPath').lean();

    return [trails] || undefined;
};

/*
Função recursiva pra popular usuários de arrays ou objetos vindos do SocialApi
Funciona recebendo um objeto ou um array de objetos

## Parãmetros:
- reference: Campo com object ou array de IDs dos usuários à serem populados (ex: userId)
- fieldName: Nome que será dado no lugar do 'reference' ao final da recursão (ex: Users)
- data: Object ou array de Object que deve ser populado
*/

async function populateUserFields(fieldName, reference, data) {
    const isArray = Array.isArray(data.data);

    // Salva todos os ID's de usuários que devem ser populado de 'data'
    const ids = isArray
        ? [...new Set(data.data.map((x) => x[reference]).filter(Boolean))]
        : [data[reference]].filter(Boolean);

    // Consultar usuários e avatares no banco
    const users = await User.find({ _id: { $in: ids } }, '_id name profilePhoto').lean();
    const userMap = Object.fromEntries(users.map((user) => [user._id.toString(), user]));

    const populateItem = (item) => {
        // Popular o usuário
        const user = userMap[item[reference]];

        return {
            [fieldName]: user || null,
            ...item,
            [reference]: undefined, // Remove a referência após popular o campo
        };
    };

    // Recursão para popular objetos aninhados de posts caso existam
    const populateNested = async (nestedData) => ({
        data: await populateUserFields(fieldName, reference, nestedData),
        total: nestedData.total,
    });

    const processItem = async (item) => {
        const populatedItem = populateItem(item);
        if (!populatedItem[fieldName]) return null;

        return {
            ...populatedItem,
            ...(item.reactions?.comments && {
                reactions: {
                    ...item.reactions,
                    comments: await populateNested(item.reactions.comments),
                },
            }),
            ...(item.replies?.data?.length && {
                replies: await populateNested(item.replies),
            }),
            ...(item.suggestedTrails?.length && {
                suggestedTrails: await populateTrailFields(item.suggestedTrails),
            }),
        };
    };

    if (isArray) {
        const processedItems = await Promise.all(data.data.map(processItem));
        return processedItems.filter(Boolean);
    }
    return processItem(data);
};

module.exports = {
    populateUserFields,
    populateTrailFields,
}
