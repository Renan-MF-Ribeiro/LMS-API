const GamificationBusiness = require('./business');
const { User } = require('../users/model');
const config = require("../../../config.json");

const GamificationController = {
    async dispatch(networkLogin, categories, props) {
        if (config.gamification.active) {
            const user = await User.findOne({ networkLogin });
            try {
                for (const category of categories) {
                    await GamificationBusiness[category](user, category, props);
                }
            } catch (err) {
                console.log(err);
            }
        }
    },
};

module.exports = GamificationController;
