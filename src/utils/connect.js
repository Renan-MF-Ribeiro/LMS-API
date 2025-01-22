const axios = require('axios');
const { defaultUserMap } = require('../components/users/model');

module.exports = {
    async getConnectMap() {
        const response = await axios.get(
            `${process.env.API_CONNECT}/maps/${process.env.CLIENT_ID}`,
            {
                headers: {
                    'connect-client-key': process.env.CONNECT_CLIENT_KEY,
                },
            }
        );
        const connectMaps = response.data?.user;
        const hasConnectMap = connectMaps && Object.keys(connectMaps).length > 0;

        return hasConnectMap ? connectMaps : defaultUserMap;
    },
};
