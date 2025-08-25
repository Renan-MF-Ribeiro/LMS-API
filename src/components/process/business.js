const kafka = require('../../utils/kafka');
const ProcessBusiness = {
    normalize: (str) => {
        return str
            ?.toString()
            ?.normalize('NFD') // decompose letters and accents
            ?.replace(/[\u0300-\u036f]/g, '') // remove diacritics
            ?.replace(/ç/g, 'c') // replace ç
            ?.replace(/Ç/g, 'C') // replace Ç
            ?.replace(/\s+/g, '_') // replace spaces with underscores
            ?.replace(/[^a-zA-Z0-9_]/g, '') // remove any other special chars
            ?.toUpperCase()
            ?.trim();
    },

    sendKafkaMessage: async (message) => {
        // todo: change here
        const topic = process.env.TOPIC_PROCESSES || "processes-process-records"

        const producer = kafka.producer()
        await producer.connect()
        await producer.send({ topic, messages: [{ value: message }] })
        await producer.disconnect()
    }
}

module.exports = ProcessBusiness