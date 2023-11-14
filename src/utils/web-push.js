const webpush = require('web-push');

const vapidKeys = {
    publicKey: 'BOycmpwTNQZPDtDeuy2wS_WIBMktn5sIZFL8vaeB7_pT9wUY2Jpvldm2V2UIxGUMJ6Hdo0KKY9bosvZIi7w7FPk',
    privateKey: '1Uz5FGGQSdX7mKXT6YlYR8FlQ3Rx_lrYXXFMsuaI1oA'
};


const options = {
    vapidDetails: {
        subject: 'mailto:example_email@example.com',
        publicKey: vapidKeys.publicKey,
        privateKey: vapidKeys.privateKey,
    },
    TTL: 60,
};


module.exports = {
    async sendMessage (subscription, payload) {

        // send notification
        return webpush.sendNotification(subscription, JSON.stringify(payload), options)

    }
}
