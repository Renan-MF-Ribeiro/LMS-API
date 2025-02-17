const webpush = require('web-push');

const options = {
    vapidDetails: {
        subject: 'mailto:renan.ribeiro@happmobi.com.br',
        publicKey: '',
        privateKey: '',
    },
    TTL: 60,
    contentEncoding: 'aes128gcm',
};


module.exports = {
    async sendMessage (subscription, payload) {

        // send notification
        return webpush.sendNotification(subscription, JSON.stringify(payload), options)

    }
}
