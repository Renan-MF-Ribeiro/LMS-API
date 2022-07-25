require('dotenv').config()
const { getUsersByTrail, getUsersByGroups, getUsersByTags, getUsersByIds } = require('../users/business')
const clientid = process.env.CLIENT_ID
const kafka = require('../../utils/kafka')

module.exports = {
    async processTargetUsers (target, category) {
        try {
            const { type, value } = target

            const users = await returnUsersBasedOnTarget(type, value, category)
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
                    topic: process.env.TOPIC_MSG,
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

async function returnUsersBasedOnTarget (type, value, category) {
    try {
        const users = []
        if (type === 'trail') {
            users.push(...(await getUsersByTrail(value.trailId, category)))
        } else if (type === 'group') {
            users.push(...(await getUsersByGroups(value.group)))
        } else if (type === 'tag') {
            users.push(...(await getUsersByTags(value.tags)))
        } else if (type === 'users') {
            users.push(...(await getUsersByIds(value.users)))
        }
        return users
    } catch (error) {
        return error
    }
}

function processMessage (campaign, user) {
    const { communication, target, ...data } = campaign

    const notificationlink = processNotificationLink(target)
    return {
        clientid,
        type: communication,
        ...data,
        identifier: user.networkLogin,
        viewed: false,
        notificationlink,
    }
}

function processNotificationLink (target) {
    const { type, value } = target
    if (type && type === 'trail') {
        const url = value.itemId ? `${process.env.DOMAIN}/#/login/entrar?redirectTo=/player/${value.trailId}/${value.itemId}` : `${process.env.DOMAIN}/#/login/entrar?redirectTo=/menu/${value.trailId}`
        const notificationlink = {
            trailid: value.trailId,
            itemid: value.itemId,
            url,
        }

        return notificationlink
    } else {
        return { url: `${process.env.DOMAIN}/#/login/entrar?redirectTo=/home`, trailid: '', item: '' }
    }
}
