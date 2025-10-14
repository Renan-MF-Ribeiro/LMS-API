const crypto = require("node:crypto");
const kafka = require("./kafka");
const environment = require("../environment");

const FILE_PROCESSOR_EVENT_TYPES = {
    ITEM_THUMB: 'item-thumb',
    TRAIL_THUMB: 'trail-thumb',
    CHANNEL_BANNER: 'channel-banner',
};

async function dispatchFileProcessorKafkaMessage(type, databaseId) {
    if (!environment.FILE_PROCESSOR_KAFKA_IMAGES_TOPIC) {
        console.log('Skipping file-processor message dispatch: FILE_PROCESSOR_KAFKA_IMAGES_TOPIC is not set.');
        return;
    }

    if (!environment.FILE_PROCESSOR_MESSAGE_SIGNATURE) {
        console.log('Skipping file-processor message dispatch: FILE_PROCESSOR_MESSAGE_SIGNATURE is not set.');
        return;
    }

    if (!Object.values(FILE_PROCESSOR_EVENT_TYPES).includes(type)) {
        console.error(`Invalid file-processor event type: ${type}`);
        return;
    }

    const signatureSecret = environment.FILE_PROCESSOR_MESSAGE_SIGNATURE;

    const hmac = crypto.createHmac('sha256', signatureSecret);

    hmac.update(JSON.stringify([
        String(environment.CLIENT_ID),
        String(String(databaseId)),
        String(type),
    ]));

    const signature = hmac.digest('hex');

    try {
        console.log(`Dispatching file-processor message: ${type} - ${databaseId} `);
        const kafkaProducer = kafka.producer();
        await kafkaProducer.connect();
        await kafkaProducer.send({
            topic: environment.FILE_PROCESSOR_KAFKA_IMAGES_TOPIC,
            messages: [
                {
                    value: JSON.stringify({
                        clientId: environment.CLIENT_ID,
                        databaseId: String(databaseId),
                        type,
                    }),
                    headers: {
                        signature,
                    },
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