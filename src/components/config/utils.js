const { CompanyConfigModel } = require('./model');

module.exports = {
    async getCompanyConfig() {
        const config = await CompanyConfigModel.findOne().sort({ _id: -1 });

        if (config) return config.value;

        return (await CompanyConfigModel.create({}))?.value;
    }
};
