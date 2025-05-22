const { default: axios } = require("axios");

const environment = require("../../environment");

const chatIAClient = axios.create({
    baseURL: environment.API_CHATBOT,
    headers: {
        'x-api-key': environment.API_KEY_CHATBOT
    }
});

function isFeatEnabled(chatIAConfig) {
    return Boolean(chatIAConfig?.value?.enabled && environment.API_CHATBOT && environment.API_KEY_CHATBOT);
}

async function dispatchChatItemKafkaEvent(itemId, event = 'UPSERT') {
    const kafkaProducer = kafka.producer();
    await kafkaProducer.connect();
    await kafkaProducer.send({
        topic: 'happlearning-ai',
        messages: [
            {
                type: event,
                item: itemId,
                clientId: environment.CLIENT_ID,
            }
        ]
    });
}

module.exports = {
    chatIAClient,
    isFeatEnabled,
    dispatchChatItemKafkaEvent,
};