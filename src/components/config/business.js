const { ConfigModel } = require("./model");

module.exports = {
  async getConfiguration(type) {
    return (await ConfigModel.findOne({ type }))?.value ?? null
  },

  async saveConfiguration(type, value) {
    return await ConfigModel.updateOne(
      { type },
      { value },
      { upsert: true, new: true }
    );
  }
};
