const axios = require('axios');
const { htmlToText } = require('html-to-text');
const { NewMessage } = require('./model');
const moment = require('moment');
const {
    getUserList,
    returnListOfIds,
    sendMessageToKafka,
    processTargetUsers,
    sendCustomMessageToKafka
} = require('./business');
const { Item } = require('../items/model');
const _messages = require('../../utils/messages');
const {
    pagination,
    ordernation,
    getUserByToken,
    getDateTodayWithoutHours, htmlToMessage
} = require('../../utils/functions');
const {
    WaitListsByCourses,
    WaitListModel,
    CourseModel
} = require('../courses/model');
const { createCSVString } = require('../../utils/files');
const { getMessengerConfig, getCronConfig } = require('../config/business');
const { CLIENT_ID, SENDINBLUE_API_KEY, SENDINBLUE_FOLDER_ID, API_MESSENGER } =
    process.env;

const getHeaders = (req) => ({
    Authorization: `Bearer ${req.headers.authorization}`
});

module.exports = {
    async createMessagingList(req, res) {
        const { name, trailFilters, userFilter } = req.body;
        let listId = null;
        let messageList = new MessageList();

        try {
            const user = await getUserByToken(req);

            messageList = {
                listName: name,
                client: CLIENT_ID,
                userId: user._id,
                trail: trailFilters.filters?.[0].trail,
                notInit: trailFilters.filters?.[0].notInit,
                inProgress: trailFilters.filters?.[0].inProgress,
                inProgressInitialDate: trailFilters.filters?.[0].inProgressInitialDate,
                inProgressFinalDate: trailFilters.filters?.[0].inProgressFinalDate,
                inProgressPercent: trailFilters.filters?.[0].inProgressSlider,
                completed: trailFilters.filters?.[0].finished,
                completedInitialDate: trailFilters.filters?.[0].finishedInitialDate,
                completedFinalDate: trailFilters.filters?.[0].finishedFinalDate,
                enableScore: trailFilters.filters?.[0].enableScore,
                percentScore: trailFilters.filters?.[0].finishedSlider,
                user: userFilter.enable,
                registrationInitialDate: userFilter.filters?.[0].registrationInitialDate,
                registrationFinalDate: userFilter.filters?.[0].registrationFinalDate,
                accessInitialDate: userFilter.filters?.[0].accessInitialDate,
                accessFinalDate: userFilter.filters?.[0].accessFinalDate
            };

            sendCustomMessageToKafka(messageList, process.env.TOPIC_MSG_LIST);
            const notification = {
                category: 'notify',
                communication: ['notification'],
                mode: 'manual',
                target: {
                    type: 'users',
                    value: {
                        users: [`${user._id}`]
                    }
                },
                text: `A lista de contatos está sendo processada\n`,
                texthtml: `<p>A lista de contatos está sendo processada<p>`,
                title: `A lista está sendo processada!`
            };

            _messages.success(res, req, notification);

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
            { id: 'email', title: 'EMAIL' }
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
                            { category: { $regex: searchBy, $options: 'i' } }
                        ]
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
                            { category: { $regex: searchBy, $options: 'i' } }
                        ]
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
                { id: 'email', title: 'EMAIL' }
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
                function(data) {
                    let requestContactImport =
                        new SibApiV3Sdk.RequestContactImport();
                    requestContactImport.fileBody = fileBody;
                    requestContactImport.listIds = [data.id];
                    requestContactImport.emailBlacklist = false;
                    requestContactImport.smsBlacklist = false;
                    requestContactImport.updateExistingContacts = true;

                    apiInstance.importContacts(requestContactImport).then(
                        function(data) {
                            _messages.success(
                                res,
                                req,
                                `Lista de contatos criada no Sendinblue com nome: "homologacao-${response.data.name}"`
                            );
                        },
                        function(error) {
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
                function(error) {
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
                    users: targetUsers
                }
            };
            campaign.target = target;
            campaign.text = htmlToMessage(campaign.textHtml);

            await sendMessageToKafka(campaign, targetUsers);

            console.log('------------------------------------');
            console.log(campaign);
            console.log(targetUsers);

            const urlUpdate = `${API_MESSENGER}/updatesendinglist`;

            await axios.put(urlUpdate, {
                id: sendingListId,
                status: 'SENT',
                title: campaign.title,
                text: campaign.text,
                textHtml: campaign.textHtml
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
                status: 'FAILED'
            });
        }
    },

    async notifyResponsibleUsers() {
        const today = new Date();
        const items = await Item.find({ expirationDate: { $exists: true } });

        const cronConfig = await getCronConfig();

        const notificationDays = cronConfig.notifyResponsibleUsers.notificationDays;

        const messengerConfig = await getMessengerConfig();

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
                                users: [item.responsible]
                            }
                        },
                        text: `O item ${item.title} perderá a validade em ${diffDays} dias!\n`,
                        texthtml: `<p>O item ${item.title} perderá a validade em ${diffDays} dias!<p>`,
                        thumbnail: messengerConfig.emailTemplate.thumbnail,
                        title: `${item.title}`
                    };

                    createMessagesFromBackend(message);
                }
            }
        }
    },

    async sendWaitingListMessage(req, res) {
        try {
            const {
                waitlistUsersArray,
                elegibleUsersArray,
                courseId,
                date,
                type,
                place
            } = req.body;

            const course = await CourseModel.findOne({ _id: courseId });

            var dateTime = moment(date).subtract('3', 'hours').format('DD/MM HH:mm').split(' ');

            let text = ' ';
            let texthtml = ' ';

            if (type == 'URL') {
                text = `Prezado(a) Aluno(a), Desejamos informar que a inscrição foi registrada na lista de espera para o curso ${course.title}. É com satisfação que comunicamos que uma nova turma deste curso será ministrada no dia ${dateTime[0]} as ${dateTime[1]}, a ser realizada através do link ${place}. Em situação de impossibilidade de participação, solicitamos que considere reingressar na lista de espera, a fim de oportunizar a vaga a outros interessados. Agradecemos antecipadamente!`;
                texthtml = `<br> <p>Prezado(a) Aluno(a), Desejamos informar que a inscrição foi registrada na lista de espera para o curso ${course.title}. <br> <br> É com satisfação que comunicamos que uma nova turma deste curso será ministrada no dia ${dateTime[0]} as ${dateTime[1]}, a ser realizada através do link <a href="${place}">${place}</a>. <br> <br> Em situação de impossibilidade de participação, solicitamos que considere reingressar na lista de espera, a fim de oportunizar a vaga a outros interessados. <br> <br> Agradecemos antecipadamente!</p> <br>`;
            } else if (type == 'text') {
                text = `Prezado(a) Aluno(a), Desejamos informar que a inscrição foi registrada na lista de espera para o curso ${course.title}. É com satisfação que comunicamos que uma nova turma deste curso será ministrada no dia ${dateTime[0]} as ${dateTime[1]}, a ser realizada nas instalações localizadas no ${place}. Em situação de impossibilidade de participação, solicitamos que considere reingressar na lista de espera, a fim de oportunizar a vaga a outros interessados. Agradecemos antecipadamente!`;
                texthtml = `<br> <p>Prezado(a) Aluno(a), Desejamos informar que a inscrição foi registrada na lista de espera para o curso ${course.title}. <br> <br> É com satisfação que comunicamos que uma nova turma deste curso será ministrada no dia ${dateTime[0]} as ${dateTime[1]}, a ser realizada nas instalações localizadas no ${place}. <br> <br> Em situação de impossibilidade de participação, solicitamos que considere reingressar na lista de espera, a fim de oportunizar a vaga a outros interessados. <br> <br> Agradecemos antecipadamente!</p> <br>`;
            }

            const messengerConfig = await getMessengerConfig();

            if (waitlistUsersArray.length > 0) {
                const waitlistUsersIdList = waitlistUsersArray.map(
                    (u) => u._id
                );
                const message = {
                    category: 'notify',
                    communication: ['notification', 'email'],
                    mode: 'manual',
                    target: {
                        type: 'users',
                        value: {
                            users: waitlistUsersIdList
                        }
                    },
                    text: text,
                    texthtml: texthtml,
                    thumbnail: messengerConfig.emailTemplate.thumbnail,
                    title: `Aviso Happlearning`
                };
                createMessagesFromBackend(message);

                for (const user of waitlistUsersIdList) {
                    await WaitListModel.findOneAndUpdate(
                        { userID: user, courseID: courseId, sent: false },
                        { sent: true }
                    );
                }
            }

            if (elegibleUsersArray.length > 0) {
                const message = {
                    category: 'notify',
                    communication: ['notification', 'email'],
                    mode: 'manual',
                    target: {
                        type: 'users',
                        value: {
                            users: elegibleUsersArray
                        }
                    },
                    text: text,
                    texthtml: texthtml,
                    thumbnail: messengerConfig.emailTemplate.thumbnail,
                    title: `Aviso Happlearning`
                };
                createMessagesFromBackend(message);
            }

            _messages.success(res, req);
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'groups',
                'get'
            );
        }
    },

    async getListsSendingLists(req, res) {
        try {
            const urlFetch = `${API_MESSENGER}/listsendinglists/`;
            const response = await axios.get(urlFetch, { headers: getHeaders(req), params: { ...req.query, clientId: CLIENT_ID } });

            return _messages.success(res, req, response.data);
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'list sending lists',
                'get'
            );
        }
    },

    async getListMessage(req, res) {
        try {
            const urlFetch = `${API_MESSENGER}/listmessage`;
            const params = { skip: req.query.skip, limit: req.query.limit, clientid: +CLIENT_ID, identifier: req.query.identifier };
            // console.log(params);
            const response = await axios.get(urlFetch, { headers: getHeaders(req), params });

            return _messages.success(res, req, response.data);
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'List messages',
                'get'
            );
        }
    },

    async getById(req, res) {
        try {
            const urlFetch = `${API_MESSENGER}/messages/v2/${req.params.id}`;
            const response = await axios.get(urlFetch, { headers: getHeaders(req) });

            return _messages.success(res, req, response.data);
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'List messages',
                'get'
            );
        }
    },

    async updateViewed(req, res) {
        try {
            const urlFetch = `${API_MESSENGER}/updateviewed`;
            const response = await axios.post(urlFetch, req.body, { headers: getHeaders(req) });

            return _messages.success(res, req, response.data);
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'List messages',
                'get'
            );
        }
    }
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

class MessageList {
    listName;
    client;
    userId;
    trail;
    notInit;
    inProgress;
    inProgressInitialDate;
    inProgressFinalDate;
    inProgressPercent;
    completed;
    completedInitialDate;
    completedFinalDate;
    enableScore;
    percentScore;
    user;
    registrationInitialDate;
    registrationFinalDate;
    accessInitialDate;
    accessFinalDate;
}
