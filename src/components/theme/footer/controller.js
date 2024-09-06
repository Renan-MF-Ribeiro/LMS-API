const { Footer } = require('./model')
const _messages = require('../../../utils/messages')

module.exports = {
    async update (req, res) {
        try {

            let footer = await Footer.findOne({}).sort({ createdAt: -1 })
            if (footer) {
                footer = await Footer.findByIdAndUpdate(footer._id, req.body)
            } else {
                footer = await Footer.create(req.body)
            }

            return _messages.success(res, req, footer)

        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'footer',
                'createOrUpdate',
            )
        }

    },

    async getFooter (req, res) {
        try {
            const data = await Footer.findOne({})
            _messages.success(res, req, data);
        }
        catch (error) {
            console.error(error)
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'Footer',
                'getFooter',
            )
        }
    }
}
