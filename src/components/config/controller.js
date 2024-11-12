const ApiError = require("../../errors/ApiError");
const { removeAccents } = require("../../utils/functions");
const { Group } = require("../groups/model");
const { getConfiguration, saveConfiguration } = require("./business");
const { ConfigTypes } = require("./model");

module.exports = {
    async getAutomaticEligibilityOnboardConfig(req, res) {
        const config = await getConfiguration(ConfigTypes.AutomaticEligibility.Onboard);

        res.json({
            config: { onboard: config ?? { enabled: false, days: 0, eligibility: [] } }
        });
    },

    async updateAutomaticEligibilityOnboardConfig(req, res) {
        const config = req.body.config?.onboard;

        if (!config) {
            throw new ApiError('Invalid onboard config')
        }

        const eligibility = (config.eligibility?.filter(Boolean) ?? []).map(removeAccents);

        const currentGroups = await Group.find({ name: { $in: eligibility } }).select('_id name');

        const newGroups = eligibility.filter(group => !currentGroups.find(g => g.name === group));

        if (newGroups.length) {
            await Group.insertMany(newGroups.map(name => ({ name, tags: [], deleted: 0, active: 1 })));
        }

        await saveConfiguration(ConfigTypes.AutomaticEligibility.Onboard, { ...config, eligibility });

        res.json({
            config: { onboard: config }
        });
    },
}