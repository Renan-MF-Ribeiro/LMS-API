const GamificationBusiness = require('./business');
const { User } = require('../users/model');

const GamificationController = {
    async dispatch(networkLogin, categories, props) {
        const user = await User.findOne({ networkLogin });
        try {
            await Promise.all(
                categories.map(async (category) => {
                    await GamificationBusiness[category](user, category, props);
                })
            );
        } catch (err) {
            console.log(err)
        }
    },
};

module.exports = GamificationController;
