const { Features } = require('./model')
const _messages = require('../../../utils/messages')
const { getDbCurrentFeatures, setAppCurrentFeatures, getAppCurrentFeatures } = require('../../../utils/features')

module.exports = {
    async update(req, res) {
        let features = getAppCurrentFeatures(req.app) ?? await getDbCurrentFeatures();

        if (features?._id) {
            features = await Features.findByIdAndUpdate(features._id, req.body, { new: true })
        } else {
            features = await Features.create(req.body)
        }

        setAppCurrentFeatures(req.app, features);

        return _messages.success(res, req, features)
    },

    async getFeatures(req, res) {
        const features = getAppCurrentFeatures(req.app) ?? await getDbCurrentFeatures();

        _messages.success(res, req, features);
    }
}
