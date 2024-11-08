const mongoose = require('mongoose');
const { connect } = require('../../utils/db');

connect();

const ConfigSchema = new mongoose.Schema(
    {
        type: { type: String, required: true, trim: true },
        value: { type: Object, required: true },
    },
    {
        strict: false,
    }
);

ConfigSchema.index({ type: 1 }, { unique: true });

const ConfigModel = mongoose.model('configs', ConfigSchema);

module.exports = {
    ConfigModel,
};
