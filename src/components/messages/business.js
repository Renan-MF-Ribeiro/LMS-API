const { getUsersByTrail, getUsersByGroups, getUsersByTags, getUsersByEmails } = require('../users/business')
const clientid = process.env.CLIENT_ID
const kafka = require('../../utils/kafka')

module.exports = {
    async processTargetUsers (target) {
        try {
            const { type, value } = target

            const users = await returnUsersBasedOnTarget(type, value)
            return users
        } catch (error) {

        }
    },

    async sendMessageToKafka (campaign, users) {
        try {
            const producer = kafka.producer()
            await producer.connect()
            const messages = []

            for (const user of users) {
                const stringMessage = JSON.stringify(processMessage(campaign, user))
                messages.push({ value: stringMessage })
            }
            const chunk = 10
            for (let i = 0; i < messages.length; i += chunk) {
                const temporary = messages.slice(i, i + chunk)
                await producer.send({
                    topic: 'messenger',
                    messages: temporary,
                })
            }

            await producer.disconnect()
        } catch (error) {
            console.log(error)
            throw error
        }
    },
}

async function returnUsersBasedOnTarget (type, value) {
    try {
        const users = []
        if (type === 'trail') {
            users.push(...(await getUsersByTrail(value.trailId)))
        } else if (type === 'group') {
            users.push(...(await getUsersByGroups(value.groups)))
        } else if (type === 'tag') {
            users.push(...(await getUsersByTags(value.tags)))
        } else if (type === 'users') {
            users.push(...(await getUsersByEmails(value.emails)))
        }
        return users
    } catch (error) {
        return error
    }
}

function processMessage (campaign, user) {
    const { title, text, communication, category } = campaign
    return {
        clientid,
        title,
        text,
        category,
        type: communication,
        identifier: user.networkLogin,
        viewed: false,
    }
}
