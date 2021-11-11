const { Kafka } = require('kafkajs')

const kafka = new Kafka({
    clientId: 'mensageiro_monolito',
    brokers: [`${process.env.KAFKA_ADDR}:${process.env.KAFKA_PORT}`],
    ssl: false,
    sasl: {
        mechanism: 'plain',
        username: process.env.KAFKA_USER,
        password: process.env.KAFKA_PWD,
    },
})

module.exports = kafka
