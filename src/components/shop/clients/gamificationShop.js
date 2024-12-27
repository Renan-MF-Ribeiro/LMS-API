const axios = require('axios');

const gamificationShopClient = axios.create({
    baseURL: `${process.env.API_GAMIFICATION}/shop`,
    headers: {
        'x-api-key': process.env.API_KEY_GAMIFICATION,
        'x-client-id': process.env.CLIENT_ID
    },
});

module.exports = gamificationShopClient;