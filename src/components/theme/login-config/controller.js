const { ConfigLogin } = require('./model')
const _messages = require('../../../utils/messages')

module.exports = {
    async createOrUpdate (req, res) {
        try {
            const body = req.body

            let config = await ConfigLogin.findOne({}).sort({ createdAt: -1 })

            if (config) {

                config = await ConfigLogin.findByIdAndUpdate(config._id, body)
            } else {
                config = await ConfigLogin.create(body)
            }

            return _messages.success(res, req, config)

        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'ConfigLogin',
                'createOrUpdate',
            )
        }

    },

    async getConfigLogin (req, res) {
        try {
            const config = await ConfigLogin.findOne({})
                .sort({ createdAt: -1 })
                .select({ createdAt: 0, updatedAt: 0, _id: 0, __v: 0, "formLogin._id": 0, 'ssoForm._id': 0 })
                .exec();


            if (config) {

                return _messages.success(res, req, config)
            }
            return _messages.conflict(res, req, null)

        }
        catch (error) {
            console.error(error)
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'config',
                'getConfigLogin',
            )
        }
    }
}
