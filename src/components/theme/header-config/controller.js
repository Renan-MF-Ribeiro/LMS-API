const { HeaderConfig } = require('./model')
const _messages = require('../../../utils/messages')

module.exports = {
    async getConfig (req, res) {
        try {
            const headerConfig = await HeaderConfig.findOne({ deleted: { $ne: true } }).select('-createdAt -updatedAt -__v ')
            return _messages.success(res, req, headerConfig)
        } catch (error) {
            console.error(error)
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'headerConfig',
                'getConfig',
            )
        }
    },

    async CreateOrUpdate (req, res) {
        try {
            const headerConfig = await HeaderConfig.findOne({ deleted: { $ne: true } })
            if (headerConfig) {
                headerConfig.modulesInHeader = req.body.modulesInHeader
                headerConfig.modulesInHeaderMobile = req.body.modulesInHeaderMobile
                await HeaderConfig.findByIdAndUpdate(headerConfig._id, headerConfig)
            } else {
                await HeaderConfig.create(req.body)
            }

            return _messages.success(res, req, headerConfig)

        }
        catch (error) {
            console.error(error)
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'headerConfig',
                'createOrUpdate',
            )
        }
    }
}