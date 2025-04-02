const kafka = require('../../../utils/kafka');
const { User } = require('../../users/model');
const GamificationLogger = require('../logs/controller');
const { GAMIFICATION_LOG_STATUS } = require('../logs/model');
const { handleUserEligibilitiesGamification } = require('../utils');
const GamificationEventBusiness = require('../events/business');
const { getDbCurrentFeatures } = require('../../../utils/features');
const { Types } = require('mongoose');

const GAMIFICATION_KAFKA_EVENTS = Object.freeze({
    PENDING: 'gamification.events.pending',
    VALIDATED: 'gamification.events.validated',
});

class GamificationKafkaSingleton {
    static instance;

    #isActive;
    #isConnected;
    #producer;
    #consumer;

    constructor() {
        if (!GamificationKafkaSingleton.instance) {
            this.#isConnected = false;
            this.#producer = kafka.producer();
            this.#consumer = kafka.consumer({ groupId: GAMIFICATION_KAFKA_EVENTS.PENDING });
            GamificationKafkaSingleton.instance = this;
        }

        return GamificationKafkaSingleton.instance;
    }

    async #setupProducer() {
        await this.#producer.connect();
    }

    async #setupConsumer() {
        await this.#consumer.connect();
        await this.#consumer.subscribe({ topic: GAMIFICATION_KAFKA_EVENTS.PENDING });
        await this.#consumeEventRuleValidation();
    }

    async #setFeature() {
        const dbCurrentFeatures = (await getDbCurrentFeatures()) || null;
        this.#isActive = !!dbCurrentFeatures?.gamefication;
    }

    get #isFeatureActive() {
        if (!this.#isActive) {
            console.error('Gamification is not active to client!');
        }

        return this.#isActive;
    }

    async start() {
        await this.#setFeature();

        if (!this.#isFeatureActive) {
            return;
        }

        if (!this.#isConnected) {
            await this.#setupProducer();
            await this.#setupConsumer();

            this.#isConnected = true;
        } else {
            console.warn('GamificationKafka is already running...');
        }
    }

    async stop() {
        if (!this.#isFeatureActive) {
            return;
        }

        if (this.#isConnected) {
            await this.#producer.disconnect();
            await this.#consumer.disconnect();

            this.#isConnected = false;
        } else {
            console.warn('GamificationKafka is already stopped...');
        }
    }

    async publishEventRuleValidation(data) {
        if (!this.#isFeatureActive) {
            return;
        }

        const log = await GamificationLogger.create(data);

        try {
            await this.#producer.send({
                topic: GAMIFICATION_KAFKA_EVENTS.PENDING,
                messages: [
                    {
                        value: JSON.stringify({
                            ...data,
                            logId: log._id,
                        }),
                    },
                ],
            });
        } catch (error) {
            await GamificationLogger.update(log._id, {
                status: GAMIFICATION_LOG_STATUS.SYSTEM_ERROR,
                error,
            });
        }
    }

    async #consumeEventRuleValidation() {
        await this.#consumer.run({
            eachMessage: async ({ message }) => {
                if (!message.value) {
                    console.warn('Received message with no value!');
                    return;
                }

                try {
                    const { events, identifier, meta } = JSON.parse(message.value.toString());

                    const isMongoId = Types.ObjectId.isValid(identifier);
                    const userQueryField = isMongoId ? '_id' : 'networkLogin';

                    const user = await User.findOne({ [userQueryField]: identifier });
                    const eligibilities = await handleUserEligibilitiesGamification(user.groupsAD);

                    for (const category of events) {
                        const payload = {
                            clientId: Number(process.env.CLIENT_ID),
                            networkLogin: user.networkLogin,
                            category,
                            eligibilities,
                            meta,
                        };

                        const validator = GamificationEventBusiness.validate(category, user, meta);
                        for await (const { validated, ...processedEvent } of validator) {
                            if (validated) {
                                await this.#producer.send({
                                    topic: GAMIFICATION_KAFKA_EVENTS.VALIDATED,
                                    messages: [
                                        {
                                            value: JSON.stringify({
                                                ...payload,
                                                ...processedEvent,
                                            }),
                                        },
                                    ],
                                });
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error processing GamificationKafka:', error);
                }
            },
        });
    }
}

const gamificationKafka = new GamificationKafkaSingleton();

const GamificationKafka = {
    async start() {
        await gamificationKafka.start();
    },
    async stop() {
        await gamificationKafka.stop();
    },

    async publishEventRuleValidation({ events, identifier, meta }) {
        await gamificationKafka.publishEventRuleValidation({ events, identifier, meta });
    },
};

process.on('SIGINT', async () => {
    console.log('SIGINT received. Shutting down GamificationKafka...');
    await gamificationKafka.stop();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Shutting down GamificationKafka...');
    await gamificationKafka.stop();
    process.exit(0);
});

module.exports = GamificationKafka;
