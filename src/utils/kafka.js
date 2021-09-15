const { Kafka } = require('kafkajs')

const kafka = new Kafka({
    clientId: 'mensageiro_monolito',
    brokers: [`${process.env.KAFKA_ADDR}:${process.env.KAFKA_PORT}`],
})

module.exports = kafka
