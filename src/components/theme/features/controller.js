const { Features } = require('./model')
const _messages = require('../../../utils/messages')

module.exports = {
    async update (req, res) {
        try {

            let features = await Features.findOne({}).sort({ createdAt: -1 })
            if (features) {
                features = await Features.findByIdAndUpdate(features._id, req.body)
            } else {
                features = await Features.create(req.body)
            }

            return _messages.success(res, req, features)

        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'features',
                'createOrUpdate',
            )
        }

    },

    async getFeatures (req, res) {
        try {
            const data = await Features.findOne({})
            _messages.success(res, req, data);
        }
        catch (error) {
            console.error(error)
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'Features',
                'getFeatures',
            )
        }
    }
}
