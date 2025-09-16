const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { handleUserEligibilitiesGamification } = require('./utils');
const { User } = require('../users/model');

const host = process.env.API_GAMIFICATION;
const clientId = process.env.CLIENT_ID;
const headers = { 'x-api-key': process.env.API_KEY_GAMIFICATION };

const GamificationBusiness = {
    async createClientUser(networkLogin, groupsAD) {
        const uri = `${host}/users/${clientId}`;
        const eligibilities = await handleUserEligibilitiesGamification(groupsAD);
        const body = { networkLogin, eligibilities };
        const { data } = await axios.post(uri, body, { headers });

        return data;
    },

    async getClientUser(networkLogin) {
        const uri = `${host}/users/${clientId}/${networkLogin}`;
        const { data } = await axios.get(uri, { headers });

        return data;
    },

    async updateClientUser(networkLogin, body) {
        const uri = `${host}/users/${clientId}/${networkLogin}`;
        const { data } = await axios.put(uri, body, { headers });

        return data;
    },

    async getClient() {
        const uri = `${host}/clients/${clientId}`;
        const { data } = await axios.get(uri, { headers });

        return data;
    },

    async getClientEvents(networkLogin) {
        const uri = `${host}/clients/${clientId}/events/${networkLogin}`;
        const { data } = await axios.get(uri, { headers });

        return data;
    },

    async getClientNiveis() {
        const uri = `${host}/clients/${clientId}/niveis`;
        const { data } = await axios.get(uri, { headers });

        return data;
    },

    async updateClient(body, requestUserLogin) {
        const uri = `${host}/clients/${clientId}`;

        const { data } = await axios.put(uri, body, { headers: { ...headers, 'x-user-id': requestUserLogin } });

        return data;
    },

    async updateClientNivelImage(nivelId, file) {
        const uri = `${host}/clients/${clientId}/${nivelId}`;
        const formData = new FormData();
        formData.append('file', fs.createReadStream(file.path), file.name);
        const { data } = await axios.put(uri, formData, {
            headers: {
                ...headers,
                'Content-Type': 'multipart/form-data',
                ...formData.getHeaders(),
            },
        });

        return data;
    },

    async getExtractByClient(query) {
        const searchParams = new URLSearchParams(query);
        const uri = `${host}/event-users/${clientId}?${searchParams}`;
        const { data } = await axios.get(uri, { headers });

        return data;
    },

    async getExtractByUser(networkLogin, query) {
        const searchParams = new URLSearchParams(query);
        const uri = `${host}/event-users/${clientId}/${networkLogin}?${searchParams}`;
        const { data } = await axios.get(uri, { headers });

        return data;
    },

    async listRewardsByUser(networkLogin) {
        const uri = `${host}/rewards/user/${networkLogin}/${clientId}`;
        const { data } = await axios.get(uri, { headers });

        return data;
    },


    async listRankingByUser(networkLogin) {
        const uri = `${host}/ranking-users/${clientId}/${networkLogin}`;
        const { data } = await axios.get(uri, { headers });

        const rankingUsers = [
            ...new Set(
                data.flatMap((ranking) =>
                    ranking.rankingUsers.map((rankingUser) => rankingUser.networkLogin)
                )
            ),
        ];
        const users = await User.find({ networkLogin: { $in: rankingUsers } });
        const usersMap = new Map(
            users.map((user) => [
                user.networkLogin,
                { name: user.name, profilePhoto: user.profilePhoto },
            ])
        );

        return data.map((ranking) => ({
            ...ranking,
            rankingUsers: ranking.rankingUsers.map((rankingUser) => ({
                ...usersMap.get(rankingUser.networkLogin),
                ...rankingUser,
            })),
        }));
    },

    async getClientRankingUsersDetails(_id, { pageIndex = 0, pageSize = 10, ...query }) {
        const searchParams = new URLSearchParams({ ...query, pageSize: 'all' });
        const uri = `${host}/ranking-users/${clientId}/${_id}/details?${searchParams}`;
        const { data } = await axios.get(uri, { headers });

        const skip = +pageIndex * +pageSize
        const limit = +skip + +pageSize

        const rankingUsers = data.data.rankingUsers.map((ru) => ru.networkLogin);
        const users = await User.find({ status: 'ATIVO', networkLogin: { $in: rankingUsers }});
        const usersMap = new Map(
            users.map((user) => [
                user.networkLogin,
                { name: user.name, profilePhoto: user.profilePhoto },
            ])
        );

        data.data.rankingUsers = data.data.rankingUsers
            .map((rankingUser) => ({
                ...usersMap.get(rankingUser.networkLogin),
                ...rankingUser,
            }))
            .slice(skip, limit);


        data.total = users.length

        return data;
    },

    async getClientRankings(query) {
        const searchParams = new URLSearchParams(query);
        const uri = `${host}/rankings/${clientId}?${searchParams}`;
        const { data } = await axios.get(uri, { headers });

        return data;
    },

    async createClientRankings(body) {
        const uri = `${host}/rankings/${clientId}`;
        const { data } = await axios.post(uri, body, { headers });

        return data;
    },

    async updateClientRankings(_id, body, requestUserLogin) {
        const uri = `${host}/rankings/${clientId}/${_id}`;

        const { data } = await axios.put(uri, body, { headers: { ...headers, 'x-user-id': requestUserLogin } });

        return data;
    },

    async deleteClientRankings(_id) {
        const uri = `${host}/rankings/${clientId}/${_id}`;
        const { data } = await axios.delete(uri, { headers });

        return data;
    },

    async getClientRewards() {
        const uri = `${host}/rewards/${clientId}`;
        // console.log(uri)
        const { data } = await axios.get(uri, { headers });

        return data;
    },

    async createClientRewards(body) {
        const uri = `${host}/rewards/${clientId}`;
        const { data } = await axios.post(uri, body, { headers });

        return data;
    },

    async updateClientRewards(_id, body, requestUserLogin) {
        const uri = `${host}/rewards/${clientId}/${_id}`;

        const { data } = await axios.put(uri, body, { headers: { ...headers, 'x-user-id': requestUserLogin } });

        return data;
    },

    async deleteClientRewards(_id) {
        const uri = `${host}/rewards/${clientId}/${_id}`;
        const { data } = await axios.delete(uri, { headers });

        return data;
    },

    async setUserStatus(networkLogin, status) {
        const uri = `${host}/users/${clientId}/${networkLogin}`;
        const body = { status };
        const { data } = await axios.patch(uri, body, { headers });

        return data;
    },
};

module.exports = GamificationBusiness;
