const { Trail } = require('../trails/model')
const _messages = require('../../utils/messages')

module.exports = {
    async getShowCaseTrails (req, res) {
        try {
            const trails = await Trail.find({ showcase: true }, ['title', 'description', 'level', 'showcase', 'thumbPath', 'createdAt', 'updatedAt']).sort({ createdAt: -1 })
            _messages.success(res, req, trails)
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'showcase', 'getShowCaseTrails')
        }
    },
}
