const { Features } = require('./model')
const _messages = require('../../../utils/messages')
const { getDbCurrentFeatures } = require('../../../utils/features')
const { getAppMaxFileSize } = require('../../../utils/files');

module.exports = {
    async update(req, res) {
        let features = await getDbCurrentFeatures(req);

        if (features?._id) {
            features = await Features.findByIdAndUpdate(features._id, req.body, { new: true })
        } else {
            features = await Features.create(req.body)
        }

        return _messages.success(res, req, features)
    },

    async getFeatures(req, res) {
        const features = await getDbCurrentFeatures(req);
        const maxFileSize = getAppMaxFileSize();

        features.maxFileSize = maxFileSize.size;
        features.maxFileSizeBytes = maxFileSize.bytes;

        _messages.success(res, req, features);
    }
}
