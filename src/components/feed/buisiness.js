const { processTargetUsers, sendMessageToKafka } = require('../new-messages/business');
const { Trail } = require('../trails/model');
const { User } = require('../users/model');
const { Avatar } = require('../theme/avatar/model');
const { default: axios } = require('axios');
const { Group } = require('../groups/model');
const { getUserByToken } = require('../../utils/functions');
const { getMessengerConfig } = require('../config/business');

/* 
 Função recursiva pra popular usuários de arrays ou objetos vindos do SocialApi
 Funciona recebendo um objeto ou um array de objetos

## Parãmetros:
- reference: Campo com object ou array de IDs dos usuários à serem populados (ex: userId)
- fieldName: Nome que será dado no lugar do 'reference' ao final da recursão (ex: Users)
- data: Object ou array de Object que deve ser populado
*/

async function populateUserFields(fieldName, reference, data) {
    // Salva todos os ID's de usuários que devem ser populado de 'data'
    const ids = new Set();
    const avatarIds = new Set();

    function collectIds(currentData) {
        const items = Array.isArray(currentData.data) ? currentData.data : [currentData];
        if (items.length === 0) return;
        for (const item of items) {
            if (item[reference]) ids.add(item[reference].toString());
            if (item.avatar) avatarIds.add(item.avatar.toString());

            if (item.reactions?.comments) collectIds(item.reactions.comments);
            if (item.comments) collectIds(item.comments);
            if (item.replies?.data) collectIds(item.replies);
            if (item.trails?.length) collectIds({ data: item.trails });
        }
    }

    collectIds(data);

    // Consultar usuários e avatares no banco em paralelo
    const [users, avatars] = await Promise.all([
        User.find({ _id: { $in: [...ids] } }, '_id name profilePhoto').lean(),
        Avatar.find({ _id: { $in: [...avatarIds] } }, '_id name image').lean(),
    ]);

    const userMap = new Map(users.map((user) => [user._id.toString(), user]));
    const avatarMap = new Map(avatars.map((avatar) => [avatar._id.toString(), avatar]));

    async function processData(currentData, userMap, avatarMap, isRoot = false) {
        const isArray = Array.isArray(currentData.data);
        const items = isArray ? currentData.data : [currentData];

        const processedItems = await Promise.all(
            items.map(async (item) => {
                const user = userMap.get(item[reference]?.toString());
                if (!user) return null;

                const populatedItem = {
                    [fieldName]: user,
                    ...item,
                    [reference]: undefined,
                    avatar: avatarMap.get(item.avatar?.toString()) || null,
                };

                if (item.reactions?.comments) {
                    populatedItem.reactions.comments = await processData(
                        item.reactions.comments,
                        userMap,
                        avatarMap
                    );
                }
                if (item.comments) {
                    populatedItem.comments = await processData(item.comments, userMap, avatarMap);
                }
                if (item.replies?.data?.length) {
                    populatedItem.replies = await processData(item.replies, userMap, avatarMap);
                }
                if (item.trails?.length) {
                    populatedItem.trails = await populateTrailFields(item.trails);
                }

                return populatedItem;
            })
        );

        const filteredItems = processedItems.filter(Boolean);
        if (isRoot) return filteredItems;
        return isArray ? { data: filteredItems, total: currentData.total } : filteredItems[0];
    }

    return processData(data, userMap, avatarMap, true);
}
async function populateSingleData(fieldName, reference, data) {
    // Salva todos os ID's de usuários que devem ser populado de 'data'
    const ids = new Set();
    const avatarIds = new Set();

    if (data[reference]) {
        ids.add(data[reference].toString());
        if (data.avatar) avatarIds.add(data.avatar.toString());
    }

    // Consultar usuários e avatares no banco em paralelo
    const [users, avatars] = await Promise.all([
        User.find({ _id: { $in: [...ids] } }, '_id name profilePhoto').lean(),
        Avatar.find({ _id: { $in: [...avatarIds] } }, '_id name image').lean(),
    ]);

    const userMap = new Map(users.map((user) => [user._id.toString(), user]));
    const avatarMap = new Map(avatars.map((avatar) => [avatar._id.toString(), avatar]));

    const user = userMap.get(data[reference]?.toString());
    if (!user) return null;

    const populatedItem = {
        [fieldName]: user,
        ...data,
        [reference]: undefined,
        avatar: avatarMap.get(data.avatar?.toString()) || null,
    };

    return populatedItem;
}

async function populateMembers(data) {
    const ids = data.data;
    const users = await User.find({ _id: { $in: ids } }, '_id name profilePhoto').lean();

    return users;
}

async function populateTrailFields(data) {
    const trails = await Trail.findOne({ _id: { $in: data } }, 'title titleURL thumbPath').lean();

    return [trails] || undefined;
}

async function createNotification(config, users) {

    const values = [
        {
            admin_post: {
                text: 'Uma nova publicação foi feita pela equipe de comunicação. Clique e confira.',
                texthtml:
                    'Uma nova publicação foi feita pela equipe de comunicação. Clique e confira.',
                title: 'Novo post da empresa!',
            },
            mention: {
                text: '',
                texthtml: '',
                title: 'Nova menção em comentário!',
            },
            comment: {
                text: '',
                texthtml: '',
                title: '',
            },
            share: {
                text: '',
                texthtml: '',
                title: `Um ${config.shareContent} foi compartilhado`,
            },
        },
    ];

    const text = values[config?.type]?.text;
    const texthtml = values[config?.type]?.texthtml;
    const title = values[config?.type]?.title;

    const messengerConfig = await getMessengerConfig();

    const message = {
        title,
        text,
        texthtml,
        communication: config.communication,
        category: 'notify',
        mode: 'manual',
        target: {
            type: 'users',
            value: {
                users,
            },
            content: {
                type: config.contentType, // Tipo da entidade sendo notificada (Ex: post, comentário, trilha)
                value: config.contentId, // ID da entidade que está sendo notificada (Ex: postId, commentId, trailId). Usada para montar a "notificationUrl",
            },
        },
        thumbnail: messengerConfig.emailTemplate.thumbnail,
    };
    try {
        async function createMessagesFromBackend(campaign) {
            const target = campaign.target;

            let targetUsers = [];

            if (!target.value.user) {
                targetUsers = await processTargetUsers(target, campaign.category);
            } else {
                Array.isArray(target?.value?.users)
                    ? targetUsers.push(...target.value.users)
                    : targetUsers.push(target.value.users);
            }

            await sendMessageToKafka(campaign, targetUsers);
        }

        await createMessagesFromBackend(message);
    } catch (error) {
        console.log(error);
    }
}

async function getSegFieldsFromUser(req) {
    const clientElegeMaps = await axios.get(
        `${process.env.API_CONNECT}/maps/elegibility/${process.env.CLIENT_ID}`,
        {
            headers: {
                'connect-client-key': process.env.CONNECT_CLIENT_KEY,
            },
        }
    );
    const elegeFields = clientElegeMaps.data.fields;
    const user = await getUserByToken(req);

    const userGroups = await Group.find({ name: { $in: user.groupsAD } }, 'name tags');
    const eligibilities = userGroups.flatMap((group) =>
        group.tags.flatMap((tag) => ({ tag: tag?.value, group: group.name }))
    );
    const userCustomElegeFields = elegeFields.map((e) => {
        const groupAD = `ELEGE_${user[e]
            ?.normalize('NFD')
            ?.replace(/[\u0300-\u036f]/g, '')
            ?.replace(/ /g, '_')
            ?.toUpperCase()}`;

        const match = eligibilities.find((eligibility) => eligibility.group === groupAD);
        return {
            [e]: user[e],
            expectedGroup: groupAD,
            groupAD: match ? match.group : null,
            tag: match ? match.tag : null,
        };
    });
    return userCustomElegeFields;
}

module.exports = {
    populateUserFields,
    populateTrailFields,
    populateMembers,
    createNotification,
    getSegFieldsFromUser,
    populateSingleData,
};
