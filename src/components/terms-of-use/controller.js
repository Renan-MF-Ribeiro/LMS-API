const { TermsOfUse } = require('./model')
const _messages = require('../../utils/messages')

module.exports = {
    async create (req, res) {
        try {
            const data = req.body
            const termsOfUse = await TermsOfUse.create(data)
            _messages.success(res, req, termsOfUse)
        } catch (error) {

        }
    },

    async list (req, res) {
        try {
            const queryParams = req.query
            const termsOfUse = await TermsOfUse.find(queryParams)
            _messages.success(res, req, termsOfUse)
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'supplier', 'list')
        }
    },

    async getLast (req, res) {
        try {
            const termsOfUse = await TermsOfUse.find().sort({ _id: -1 }).limit(1)
            _messages.success(res, req, termsOfUse[0])
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'supplier', 'deleteAll')
        }
    },

}
