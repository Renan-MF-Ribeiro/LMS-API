const kafka = require("./kafka");
const environment = require("../environment");

const FILE_PROCESSOR_EVENT_TYPES = {
    ITEM_THUMB: 'item-thumb',
    TRAIL_THUMB: 'trail-thumb',
    CHANNEL_BANNER: 'channel-banner',
};

async function dispatchFileProcessorKafkaMessage(type, databaseId) {
    if (!environment.FILE_PROCESSOR_KAFKA_TOPIC) {
        console.log('Skipping file-processor message dispatch: FILE_PROCESSOR_KAFKA_TOPIC is not set.');
        return;
    }

    if (!Object.values(FILE_PROCESSOR_EVENT_TYPES).includes(type)) {
        console.error(`Invalid file-processor event type: ${type}`);
        return;
    }

    try {
        console.log(`Dispatching file-processor message: ${type} - ${databaseId} `);
        const kafkaProducer = kafka.producer();
        await kafkaProducer.connect();
        await kafkaProducer.send({
            topic: environment.FILE_PROCESSOR_KAFKA_TOPIC,
            messages: [
                {
                    value: JSON.stringify({
                        type,
                        databaseId: String(databaseId),
                        clientId: environment.CLIENT_ID,
                    }),
                }
            ]
        });
    } catch (error) {
        console.error(`Failed to dispatch file-processor message: ${type} - ${databaseId}:`, error);
    }
}

module.exports = {
    FILE_PROCESSOR_EVENT_TYPES,
    dispatchFileProcessorKafkaMessage,
};