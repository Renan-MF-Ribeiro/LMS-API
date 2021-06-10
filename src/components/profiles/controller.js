const _messages = require('../../utils/messages')
const { Profile } = require('./model')

module.exports = {
    async findAll (req, res) {
        try {
            const profiles = await Profile.find()
            _messages.success(res, req, profiles)
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'section', '/createSession')
        }
    },

    async create (req, res) {
        try {
            const { title } = req.body
            const count = await Profile.find({
                title: { $eq: title },
            }).countDocuments()

            if (count < 1) {
                const profiles = await Profile.create({ title })
                _messages.success(res, req, profiles, 'Criação de dados', 'profiles', 'create', profiles, [], true, 'CREATE')
            } else {
                _messages.badRequest(res, req, 'Esse perfil já está cadastrado', 'Esse perfil já está cadastrado', 'profiles', 'create')
            }
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'profiles', '/create')
        }
    },
}
