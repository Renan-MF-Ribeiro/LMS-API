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
    try {
        console.log(`Dispatching chat item ${itemId} ${event}`);
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
    } catch (error) {
        console.error(`Failed to dispatch chat item ${itemId} event ${event}:`, error);
    }
}

module.exports = {
    chatIAClient,
    isFeatEnabled,
    dispatchChatItemKafkaEvent,
};