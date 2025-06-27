const { default: axios } = require("axios");
const environment = require("../../environment");
const ApiError = require("../../errors/ApiError");
const { ChatIAConfigModel } = require("../config/model");
const { getChatIAConfig } = require("../config/business");
const { Avatar } = require("../theme/avatar/model");
const { getUserByToken } = require("../../utils/functions");
const { getTagsElegiblesByToken, getSectionTrailId, checkEligibilityTagsAnd, isSectionTrailInfo } = require("../sections/business");
const { Channel } = require("../channels/model");
const { Section } = require("../sections/model");
const { Trail } = require("../trails/model");
const mongoose = require('mongoose');
const { ChatbotLog } = require("./model");
const { i18nBusiness } = require("../i18n/business");
const { LOCALE } = require("../i18n/model");

const ObjectId = mongoose.Types.ObjectId;

const chatIAClient = axios.create({
    baseURL: environment.CHATBOT_API,
    headers: {
        'x-api-key': environment.CHATBOT_API_KEY
    }
});

function isFeatEnabled(chatIAConfig) {
    return Boolean(chatIAConfig?.value?.enabled && environment.CHATBOT_API && environment.CHATBOT_API_KEY);
}

module.exports = {
    async checkFeatStatus(req, res) {
        const chatConfig = await getChatIAConfig();

        const avatar = chatConfig?.value?.avatarId
            ? await Avatar.findById(chatConfig.value.avatarId).select('name image')
            : null;

        return res.json({
            enabled: isFeatEnabled(chatConfig),
            avatar,
            channelsId: chatConfig?.value?.channelsId ?? [],
            label: chatConfig?.value?.label ?? [],
        });
    },

    async sendMessage(req, res) {
        const { message, channel, trail, thread } = req.body ?? {};

        const chatConfig = await getChatIAConfig();

        const user = await getUserByToken(req);

        if (!isFeatEnabled(chatConfig)) throw new ApiError('Chat não habilitado', 401);

        if (!message) throw new ApiError('Mensagem não enviada', 400);

        if (!channel) throw new ApiError('Contexto do canal não enviado', 400);

        const avatar = chatConfig?.value?.avatarId
            ? await Avatar.findById(chatConfig.value.avatarId)
            : null;

        const tags = await getTagsElegiblesByToken(req);

        // const eligibleTrails = [];

        const foundChannel = await Channel.findOne({
            _id: new ObjectId(channel),
        }).select('title idSections');

        if (!foundChannel) {
            throw new ApiError('Canal não encontrado', 400);
        }

        const sections = await Section.find({
            deleted: 0,
            active: 1,
            _id: {
                $in: foundChannel.idSections.map(section => new ObjectId(section))
            }
        }).select('title tags trails active deleted');

        let trailsId = sections
            .flatMap(section => section.trails)
            .map(section => getSectionTrailId(section))
            .filter(Boolean)
            .map(trail => new ObjectId(trail));

        if (trail) {
            trailsId = trailsId.filter(trailId => String(trailId) === String(trail));
        }

        const availableTrails = await Trail.find({
            _id: { $in: trailsId },
            enabled: true,
            $or: [
                { tags: { $in: tags } },
                { tagsAnd: { $in: tags } },
            ],
        }).select('_id title titleUrl tags tagsAnd items');

        const eligibleTrails = availableTrails.filter(trail => checkEligibilityTagsAnd(tags, trail.tagsAnd, trail.tags));

        const eligibleItems = eligibleTrails
            .flatMap(trail => trail.items.filter(item => item.itemID))
            .map(item => new ObjectId(item.itemID));

        const apiBody = {
            message,
            thread,
            botName: avatar?.name ?? chatConfig?.value?.label ?? 'Minha IA',
            items: Array.from(new Set(eligibleItems)),
        };

        let messageId = null;
        let apiData = null;
        let threadId = null;

        try {
            const { data } = await chatIAClient.post('/ai/send-message', apiBody);

            apiData = data;
            messageId = data?.messageId;
            threadId = data?.thread;

            const apiResponseMessage = data?.completion?.choices?.[0]?.message ?? data?.choices?.[0]?.message;

            if (!apiResponseMessage) {
                throw new ApiError('Resposta da IA não encontrada', 500);
            }

            const messageContent = apiResponseMessage.content;
            const messageCitations = apiResponseMessage.context?.citations ?? [];
            const itemsReferences = new Set();

            const messageHasCitationsReferences = messageContent.match(/\[doc\d+\]/g);

            if (messageHasCitationsReferences?.length) {
                const docIndexes = messageHasCitationsReferences
                    .map(
                        doc => doc
                            .replace(/\[doc/g, '')
                            .replace(/\]/g, '')
                    );

                docIndexes.forEach(index => {
                    const citation = messageCitations[index];

                    if (citation) {
                        itemsReferences.add(citation.filepath);
                    }
                });
            }

            let messageContentWithoutCitations = messageContent
                .replace(/\[doc\d+\]/g, '')
                .replace(/\s+/g, ' ')
                .replace(/ \./g, '.')
                .trim();

            // Se não houver referências de citações na mensagem, mas houver citações, adiciona as referências
            if (!messageHasCitationsReferences?.length && messageCitations.length) {
                messageCitations?.forEach(citation => {
                    if (itemsReferences.size > 2) return;

                    itemsReferences.add(citation.filepath);
                });
            }

            const itemsArray = Array.from(itemsReferences);

            const trailsArray = itemsArray.length ? eligibleTrails
                .filter(trail => itemsArray.some(item => trail.items.some(i => String(i.itemID) === String(item))))
                .map(
                    trail => ({
                        _id: trail._id,
                        title: trail.title,
                        titleUrl: trail.titleUrl,
                    })
                ) : [];

            // Se não houver referências de citações na mensagem, mas houver trilhas, adiciona uma mensagem opcional
            if (!messageHasCitationsReferences?.length && trailsArray.length) {
                const optionalReferenceMessages = await i18nBusiness.translate({
                    locale: LOCALE.BR,
                    key: 'chat.message.send.optionalReferenceMessages'
                })

                messageContentWithoutCitations = `${messageContentWithoutCitations} <p>${optionalReferenceMessages[Math.floor(Math.random() * optionalReferenceMessages.length)]}</p>`;
            }

            const response = {
                messageId,
                message: messageContentWithoutCitations,
                threadId,
                items: itemsArray,
                trails: trailsArray,
            };

            if (environment.CHATBOT_LOG) {
                await ChatbotLog.create({
                    user: user._id,
                    channel: foundChannel?._id ?? null,
                    trail: trail ? new ObjectId(trail) : null,
                    body: req.body,
                    response,
                    apiBody,
                    apiResponse: data,
                    messageId,
                    threadId,
                    error: null,
                });
            } else {
                console.log('Chatbot log is disabled, skipping log creation');
            }

            return res.json(response);
        } catch (error) {
            const errorMessages = [
                "Desculpe, não consegui entender a pergunta.",
                "Infelizmente, não consegui compreender a solicitação.",
                "Peço desculpas, mas não consegui entender o que foi dito.",
                "Sinto muito, mas não consegui interpretar a pergunta.",
            ]

            const response = {
                messageId,
                threadId,
                message: errorMessages[Math.floor(Math.random() * errorMessages.length)],
                items: [],
                trails: [],
            };

            await ChatbotLog.create({
                user: user._id,
                channel: foundChannel?._id ?? null,
                trail: trail ? new ObjectId(trail) : null,
                body: req.body,
                response,
                apiBody,
                apiResponse: apiData,
                messageId,
                threadId,
                error,
            });

            return res.json(response);
        }
    },

    async feedbackMessage(req, res) {
        const messageId = req.params.messageId;

        const { feedback } = req.body ?? {};

        if (!messageId) throw new ApiError('ID da mensagem não enviado', 400);

        if (![-1, 1].includes(feedback)) {
            const feedbackError = await i18nBusiness.translate({
                locale: LOCALE.BR,
                key: 'chat.messages.errors.feedback'
            })
            
            throw new ApiError(feedbackError, 400);
        }

        await chatIAClient.post('/ai/send-message-rating', {
            messageId,
            rating: feedback,
        });

        await ChatbotLog.findOneAndUpdate(
            { messageId },
            { messageFeedback: feedback },
        );

        return res.json({ success: true });
    }
}