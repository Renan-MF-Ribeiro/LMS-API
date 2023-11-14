const webpush = require('web-push');
const config = require('../../config.json');



const options = {
    vapidDetails: {
        subject: 'mailto:renan.ribeiro@happmobi.com.br',
        publicKey: config.vapidKeys.publicKey,
        privateKey: config.vapidKeys.privateKey,
    },
    TTL: 60,
};


module.exports = {
    async sendMessage (subscription, payload) {

        // send notification
        return webpush.sendNotification(subscription, JSON.stringify(payload), options)

    }
}
