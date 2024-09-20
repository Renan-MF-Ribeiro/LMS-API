const axios = require('axios');
const { Group } = require('../groups/model');
const { User } = require('../users/model');

const host = process.env.API_ASSESSMENT;
const clientId = process.env.CLIENT_ID;
const headers = { 'x-client-key': process.env.API_KEY_ASSESSMENT };

const AssessmentBusiness = {
    async updateUserEligibilities(userId) {
        try {
            const uri = `${host}/users/${clientId}/${userId}`;
            const { data } = await axios.get(uri, { headers });
            const eligibilities = data.eligibilities.flatMap((eligibility) => eligibility.tags);
            const assessmentGroups = await Group.find({ 'tags.value': { $in: eligibilities } });
            await User.updateOne(
                { _id: userId },
                { $set: { assessmentGroups: assessmentGroups.flatMap(({ name }) => name) } }
            );
        } catch {}
    },

    async listTrainingSectionsStatus(userId) {
        const uri = `${host}/historics/training/${clientId}/${userId}/status`;
        const { data } = await axios.get(uri, { headers });

        return data;
    },

    async listTrainingSections(userId) {
        const uri = `${host}/historics/training/${clientId}/${userId}`;
        const { data } = await axios.get(uri, { headers });

        return data;
    }
};

module.exports = AssessmentBusiness;
