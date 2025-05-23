const { default: axios } = require("axios");

const environment = require("../../environment");

const kafka = require("../../utils/kafka");

const chatIAClient = axios.create({
    baseURL: environment.CHATBOT_API,
    headers: {
        'x-api-key': environment.CHATBOT_API_KEY
    }
});

function isFeatEnabled(chatIAConfig) {
    return Boolean(chatIAConfig?.value?.enabled && environment.CHATBOT_API && environment.CHATBOT_API_KEY);
}

async function dispatchChatItemKafkaEvent(itemId, event = 'UPSERT') {
    const kafkaProducer = kafka.producer();
    await kafkaProducer.connect();
    await kafkaProducer.send({
        topic: environment.CHATBOT_KAFKA_TOPIC,
        messages: [
            {
                value: JSON.stringify({
                    type: event,
                    item: itemId,
                    clientId: environment.CLIENT_ID,
                }),
            }
        ]
    });
}

module.exports = {
    chatIAClient,
    isFeatEnabled,
    dispatchChatItemKafkaEvent,
};