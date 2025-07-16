const { Partner } = require("./model");

const PartnerBusiness = {

    getPartnersByToken: async (token) => {
        return await Partner.findOne({ 'keys.key': token, active: true });
    }
};

module.exports = PartnerBusiness;