const { processTargetUsers, sendMessageToKafka } = require('../new-messages/business');
const { Trail } = require('../trails/model');
const { User } = require('../users/model');
const { Avatar } = require('../theme/avatar/model');
const options = require('../../../config.json');
const { default: axios } = require('axios');
const { Group } = require('../groups/model');
const { getUserByToken } = require('../../utils/functions');

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

    const avatarIds = isArray
        ? [...new Set(data.data.map((x) => x.avatar).filter(Boolean))]
        : [data.avatar].filter(Boolean);

    // Consultar usuários e avatares no banco
    const users = await User.find({ _id: { $in: ids } }, '_id name profilePhoto').lean();
    const userMap = Object.fromEntries(users.map((user) => [user._id.toString(), user]));

    const avatars = await Avatar.find({ _id: { $in: avatarIds } }, '_id name image').lean();
    const avatarMap = Object.fromEntries(avatars.map((avatar) => [avatar._id.toString(), avatar]));

    const populateItem = (item) => {
        // Popular o usuário
        const user = userMap[item[reference]];

        // Popular o avatar se existir
        if (item.avatar) {
            item.avatar = avatarMap[item.avatar];
        }

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
            ...(item.trails?.length && {
                trails: await populateTrailFields(item.trails),
            }),
        };
    };

    if (isArray) {
        const processedItems = await Promise.all(data.data.map(processItem));
        return processedItems.filter(Boolean);
    }
    return processItem(data);
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
    let text,
        texthtml,
        title = undefined;

    // Config.TYPE
    // Valores que podem ser recebidos em "config.type" ('mention', 'comment', 'share')
    // É a AÇÃO que está sendo notificada.
    const shareContent = config.contentType === 'post' ? 'um post' : 'uma trilha';
    const typesOfNotification = {
        mention: 'mencionou você em um',
        comment: 'respondeu seu',
        share: `compartilhou ${shareContent} com você`,
    };

    // Config.CONTENT
    // Valores que podem ser recebidos em "config.contetType" ("post", "comentário", "trilha")
    // É a ENTIDADADE que está sendo compartilhada

    // As frases são criadas concatenando a ação e o objeto do que está sendo notificado.
    text = `Olá! O usuário ${config.reqUser} ${typesOfNotification[config.type]} ${
        config.type !== 'share' ? config.contentType : ''
    }!`;
    texthtml = `<br> <p>Olá! O usuário ${config.reqUser} ${typesOfNotification[config.type]} ${
        config.type !== 'share' ? config.contentType : ''
    }!</p> <br>`;
    title = `Happlearning - ${config.reqUser} ${typesOfNotification[config.type]} ${
        config.type !== 'share' ? config.contentType : ''
    }!`;

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
        thumbnail: options.messenger.emailTemplate.thumbnail,
    };

    try {
        async function createMessagesFromBackend(campaign) {
            const target = campaign.target;

            let targetUsers = [];

            if (!target.value.user) {
                targetUsers = await processTargetUsers(target, campaign.category);
            } else {
                targetUsers.push({ ...target.value.user });
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
};
