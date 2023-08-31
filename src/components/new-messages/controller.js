const axios = require('axios');
const config = require('../../../config.json');
const { htmlToText } = require('html-to-text');
const { NewMessage } = require('./model');
const {
    getUserList,
    returnListOfIds,
    sendMessageToKafka,
    processTargetUsers,
} = require('./business');
const { Item } = require('../items/model');
const _messages = require('../../utils/messages');
const {
    pagination,
    ordernation,
    getUserByToken,
    getDateTodayWithoutHours,
} = require('../../utils/functions');
const { createCSVString } = require('../../utils/files');
const { CLIENT_ID, SENDINBLUE_API_KEY, SENDINBLUE_FOLDER_ID, API_MESSENGER } =
    process.env;

module.exports = {
    async createMessagingList(req, res) {
        const { name, trailFilters, userFilter } = req.body;
        let listId = null;

        try {
            const user = await getUserByToken(req);

            const urlCreate = `${API_MESSENGER}/createsendinglist`;
            const messagingList = await axios.post(urlCreate, {
                clientId: CLIENT_ID,
                name,
                status: 'PROCESSING',
                isListProcessed: false,
                creatorId: user._id,
                appliedFilters: { trailFilters, userFilter },
            });
            listId = messagingList.data.id;

            const notification = {
                category: 'notify',
                communication: ['notification'],
                mode: 'manual',
                target: {
                    type: 'users',
                    value: {
                        users: [`${user._id}`],
                    },
                },
                text: `Sua lista de contatos está sendo processada\n`,
                texthtml: `<p>Sua lista de contatos está sendo processada<p>`,
                title: `Sua lista está sendo processada!`,
            };

            _messages.success(res, req, notification);
            createMessagesFromBackend(notification);

            try {
                const userList = await getUserList(trailFilters, userFilter);
                const urlUpdate = `${API_MESSENGER}/updatesendinglist`;
                await axios.put(urlUpdate, {
                    id: listId,
                    clientId: CLIENT_ID,
                    users: userList,
                    status: 'PROCESSED',
                    isListProcessed: true,
                });

                const userListNotification = {
                    category: 'notify',
                    communication: ['notification'],
                    mode: 'manual',
                    target: {
                        type: 'users',
                        value: {
                            users: [`${user._id}`],
                        },
                    },
                    text: `Sua lista de contatos foi processada!\n`,
                    texthtml: `<p>Sua lista de contatos foi processada!<p>`,
                    title: `Sua lista foi processada!`,
                };
                createMessagesFromBackend(userListNotification);
            } catch (error) {
                if (listId) {
                    const urlUpdate = `${API_MESSENGER}/updatesendinglist`;
                    await axios.put(urlUpdate, {
                        id: listId,
                        clientId: CLIENT_ID,
                        users: [],
                        status: 'FAILED',
                        isListProcessed: true,
                    });
                    const userListNotification = {
                        category: 'notify',
                        communication: ['notification'],
                        mode: 'manual',
                        target: {
                            type: 'users',
                            value: {
                                users: [`${user._id}`],
                            },
                        },
                        text: `O processamento da sua lista de contatos falhou.\n`,
                        texthtml: `<p>O processamento da sua lista de contatos falhou.<p>`,
                        title: `Falha no processamento`,
                    };
                    createMessagesFromBackend(userListNotification);
                }
                console.log(error);
            }
        } catch (error) {
            console.log(error);
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor ao criar lista',
                'new-messages',
                'post /create-list'
            );
        }
    },

    async downloadListFile(req, res) {
        const { listId } = req.query;
        const today = getDateTodayWithoutHours();
        const urlFetch = `${API_MESSENGER}/fetchsendinglist/${listId}`;
        const response = await axios.get(urlFetch);
        const filename = `lista-de-contatos-${today}`;

        const header = [
            { id: 'name', title: 'NOME' },
            { id: 'email', title: 'EMAIL' },
        ];

        const str = createCSVString(header, response.data.users);

        res.setHeader('Content-disposition', `attachment; ${filename}`);
        res.set('Content-Type', 'text/csv');
        res.status(200).send(str);
    },

    async getMessages(req, res) {
        try {
            const { skip, limit } = pagination(req);
            const { order, sort } = ordernation(req);
            const searchBy = req.query.searchBy;

            const messages = await NewMessage.find(
                searchBy
                    ? {
                          $or: [
                              { title: { $regex: searchBy, $options: 'i' } },
                              { text: { $regex: searchBy, $options: 'i' } },
                              { category: { $regex: searchBy, $options: 'i' } },
                          ],
                      }
                    : {}
            )
                .sort({ [order]: sort })
                .skip(parseInt(skip))
                .limit(parseInt(limit));

            const total = await NewMessage.find(
                searchBy
                    ? {
                          $or: [
                              { title: { $regex: searchBy, $options: 'i' } },
                              { text: { $regex: searchBy, $options: 'i' } },
                              { category: { $regex: searchBy, $options: 'i' } },
                          ],
                      }
                    : {}
            ).count();

            _messages.success(res, req, { messages, total });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'newMessage',
                'returnUsers'
            );
        }
    },

    async getMessageById(req, res) {
        try {
            const { id } = req.params;
            const message = await NewMessage.findOne({ _id: id });
            _messages.success(res, req, message);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'newMessage',
                'returnMessage'
            );
        }
    },

    async sendListToSendInBlue(req, res) {
        try {
            const { listId } = req.body;
            const urlFetch = `${API_MESSENGER}/fetchsendinglist/${listId}`;
            const response = await axios.get(urlFetch);
            const header = [
                { id: 'name', title: 'NOME' },
                { id: 'email', title: 'EMAIL' },
            ];

            const fileBody = createCSVString(header, response.data.users);

            const today = getDateTodayWithoutHours();

            const SibApiV3Sdk = require('sib-api-v3-sdk');
            let defaultClient = SibApiV3Sdk.ApiClient.instance;
            let apiInstance = new SibApiV3Sdk.ContactsApi();
            let apiKey = defaultClient.authentications['api-key'];
            apiKey.apiKey = SENDINBLUE_API_KEY;

            let createList = new SibApiV3Sdk.CreateList();
            createList.name = `homologacao-${response.data.name}`;
            createList.folderId = Number(SENDINBLUE_FOLDER_ID);

            apiInstance.createList(createList).then(
                function (data) {
                    let requestContactImport =
                        new SibApiV3Sdk.RequestContactImport();
                    requestContactImport.fileBody = fileBody;
                    requestContactImport.listIds = [data.id];
                    requestContactImport.emailBlacklist = false;
                    requestContactImport.smsBlacklist = false;
                    requestContactImport.updateExistingContacts = true;

                    apiInstance.importContacts(requestContactImport).then(
                        function (data) {
                            _messages.success(
                                res,
                                req,
                                `Lista de contatos criada no Sendinblue com nome: "homologacao-${response.data.name}"`
                            );
                        },
                        function (error) {
                            _messages.internalServer(
                                res,
                                req,
                                error.message,
                                'Erro interno no servidor',
                                'newMessage',
                                'sendToSendInBlue'
                            );
                        }
                    );
                },
                function (error) {
                    _messages.internalServer(
                        res,
                        req,
                        error.message,
                        'Erro interno no servidor',
                        'newMessage',
                        'sendToSendInBlue'
                    );
                }
            );
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'newMessage',
                'sendToSendInBlue'
            );
        }
    },

    async createMessages(req, res) {
        const { sendingListId } = req.body;
        const campaign = req.body;

        const urlFetch = `${API_MESSENGER}/fetchsendinglist/${sendingListId}`;
        const response = await axios.get(urlFetch);

        try {
            const targetUsers = await returnListOfIds(response.data.users);
            const target = {
                type: 'users',
                value: {
                    users: targetUsers,
                },
            };
            campaign.target = target;
            campaign.text = htmlToText(campaign.textHtml, {
                wordwrap: 130,
            });

            await sendMessageToKafka(campaign, targetUsers);

            const urlUpdate = `${API_MESSENGER}/updatesendinglist`;

            await axios.put(urlUpdate, {
                id: sendingListId,
                status: 'SENT',
                title: campaign.title,
                text: campaign.text,
                textHtml: campaign.textHtml,
            });

            _messages.success(res, req, sendingListId);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'groups',
                'get'
            );
            const urlUpdate = `${API_MESSENGER}/updatesendinglist`;
            await axios.put(urlUpdate, {
                id: sendingListId,
                status: 'FAILED',
            });
        }
    },

    async notifyResponsibleUsers() {
        const today = new Date();
        const items = await Item.find({ expirationDate: { $exists: true } });
        const notificationDays =
            config.cron.notifyResponsibleUsers.notificationDays;

        for (const item of items) {
            if (item.responsible) {
                const diffTime = Math.abs(today - item.expirationDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (notificationDays.includes(diffDays)) {
                    const message = {
                        category: 'notify',
                        communication: ['notification', 'email'],
                        mode: 'manual',
                        target: {
                            type: 'users',
                            value: {
                                users: [item.responsible],
                            },
                        },
                        text: `O item ${item.title} perderá a validade em ${diffDays} dias!\n`,
                        texthtml: `<p>O item ${item.title} perderá a validade em ${diffDays} dias!<p>`,
                        thumbnail: config.messenger.emailTemplate.thumbnail,
                        title: `${item.title}`,
                    };

                    createMessagesFromBackend(message);
                }
            }
        }
    },
};

async function createMessagesFromBackend(body) {
    try {
        const campaign = body;
        const target = campaign.target;
        let targetUsers = [];

        if (!target.value.user) {
            targetUsers = await processTargetUsers(target, campaign.category);
        } else {
            targetUsers.push({ ...target.value.user });
        }

        await sendMessageToKafka(campaign, targetUsers);
    } catch (error) {
        console.log(error);
    }
}
