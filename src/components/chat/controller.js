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
        });
    },

    async sendMessage(req, res) {
        const { message, channel, trail } = req.body ?? {};

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
            botName: avatar?.name ?? 'Chatbot',
            items: Array.from(new Set(eligibleItems)),
        };

        let messageId = null;
        let apiData = null;

        try {
            const { data } = await chatIAClient.post('/ai/send-message', apiBody);

            apiData = data;
            messageId = data?.messageId;

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

            const messageContentWithoutCitations = messageContent
                .replace(/\s+/g, ' ')
                .replace(/\s\./g, '.')
                .replace(/\[doc\d+\]/g, '').trim();

            const itemsArray = Array.from(itemsReferences);

            const trailsArray = eligibleTrails
                .filter(trail => itemsArray.some(item => trail.items.some(i => String(i.itemID) === String(item))))
                .map(
                    trail => ({
                        id: trail._id,
                        title: trail.title,
                        titleUrl: trail.titleUrl,
                    })
                );

            const response = {
                messageId,
                message: messageContentWithoutCitations,
                items: itemsArray,
                trails: trailsArray,
            };

            await ChatbotLog.create({
                user: user._id,
                channel: foundChannel?._id ?? null,
                trail: trail ? new ObjectId(trail) : null,
                body: JSON.stringify(req.body),
                response: JSON.stringify(response),
                apiBody: JSON.stringify(apiBody),
                apiResponse: JSON.stringify(data),
                messageId,
                error: null,
            });

            return res.json(response);
        } catch (error) {
            const errorMessages = [
                "Desculpe, não consegui entender sua pergunta.",
                "Infelizmente, não consegui compreender sua solicitação.",
                "Peço desculpas, mas não consegui entender o que você quis dizer.",
                "Sinto muito, mas não consegui interpretar sua pergunta.",
            ]

            const response = {
                messageId,
                message: errorMessages[Math.floor(Math.random() * errorMessages.length)],
                items: [],
                trails: [],
            };

            await ChatbotLog.create({
                user: user._id,
                channel: foundChannel?._id ?? null,
                trail: trail ? new ObjectId(trail) : null,
                body: JSON.stringify(req.body),
                response: JSON.stringify(response),
                apiBody: JSON.stringify(apiBody),
                apiResponse: JSON.stringify(apiData),
                messageId,
                error,
            });

            return res.json(response);
        }
    },

    async feedbackMessage(req, res) {
        const messageId = req.params.messageId;

        const { feedback } = req.body ?? {};

        if (!messageId) throw new ApiError('ID da mensagem não enviado', 400);

        if (![-1, 1].includes(feedback)) throw new ApiError('Feedback inválido. O valor deve ser -1 ou 1', 400);

        await chatIAClient.post('/ai/send-message-rating', {
            messageId,
            rating: feedback,
        });

        await ChatbotLog.findOneAndUpdate(
            { messageId },
            { messageFeedback: feedback },
        );

        if (!log) throw new ApiError('Log não encontrado', 404);

        return res.json({ success: true });
    }
}