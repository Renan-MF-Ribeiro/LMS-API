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

        const { data } = await chatIAClient.post('/ai/send-message', {
            message,
            botName: avatar?.name ?? 'Chatbot',
            items: Array.from(new Set(eligibleItems)),
        });

        const apiResponseMessage = data?.choices?.[0]?.message;

        if (!apiResponseMessage) {
            return res.json({ message: 'Desculpe, não consegui entender sua pergunta.' });
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

        return res.json({
            message: messageContentWithoutCitations,
            items: itemsArray,
            trails: trailsArray,
            apiResponse: data
        });
    }
}