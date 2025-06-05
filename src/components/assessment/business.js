const axios = require('axios');
const { Group } = require('../groups/model');
const { User } = require('../users/model');

const host = process.env.API_ASSESSMENT;
const clientId = process.env.CLIENT_ID;
const headers = { 'x-client-key': process.env.API_KEY_ASSESSMENT };

const AssessmentBusiness = {
    async updateUserEligibilities(userId, pillarId, cycleId, periodId) {
        try {
            const uri = `${host}/users/${clientId}/${userId}`;
            const { data } = await axios.get(uri, { headers });
            const eligibilities = data.eligibilities.find((el) => el?.pillar === pillarId)?.tags;

            if (!!eligibilities?.length) {
                const groups = await Group.find({ 'tags.value': { $in: eligibilities } });
                const user = await User.findById(userId);
                const tags = groups.flatMap(({ name }) => name);

                const newAssessmentGroup = { pillarId, cycleId, periodId, tags };

                const index = user.assessmentGroups.findIndex((ag) => {
                    return (
                        ag?.pillarId === pillarId &&
                        ag?.cycleId === cycleId &&
                        ag?.periodId === periodId
                    );
                });

                if (index === -1) {
                    user.assessmentGroups.push(newAssessmentGroup);
                } else {
                    user.assessmentGroups[index] = newAssessmentGroup;
                }

                user.groupsAD = [...new Set(user.groupsAD.concat(tags))];

                await user.save();
            }
        } catch (error) {
            console.log({ error });
        }
    },

    async listTrainingSectionsStatus(userId, eligibilityTags = []) {
        const uri = `${host}/historics/training/${clientId}/${userId}/status`;
        const { data } = await axios.post(uri, { eligibilityTags }, { headers });

        return data;
    },

    async listTrainingSections(userId) {
        const uri = `${host}/historics/training/${clientId}/${userId}`;
        const { data } = await axios.get(uri, { headers });

        return data;
    },

    async getHistoricBySectionId(userId, sectionId) {
        const uri = `${host}/historics/${clientId}/${userId}/section/${sectionId}`;
        const { data } = await axios.get(uri, { headers });
        
        return data
    },
};

module.exports = AssessmentBusiness;
