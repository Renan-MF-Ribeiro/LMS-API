const _messages = require('../../utils/messages')
const { Profile } = require('./model')
const { i18nBusiness } = require('../i18n/business')
const { LOCALE } = require('../i18n/model')

module.exports = {
    async findAll(req, res) {
        try {
            const profiles = await Profile.find().sort({ label: 'asc' }).lean()

            const translatedProfiles = await i18nBusiness.translate({
                locale: LOCALE.BR,
                key: 'profiles',
                items: profiles,
                matcher: 'title'
            })

            _messages.success(res, req, translatedProfiles)
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'section', '/createSession')
        }
    },

    async create(req, res) {
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

    async update(req, res) {
        const { id: _id } = req.params

        const profileExists = await Profile.findOne({ _id })
        if (!profileExists) {
            return _messages.badRequest(res, req, 'Perfil não encontrado', 'Perfil não encontrado', 'profiles', 'update')
        }

        const profile =  await Profile.findOneAndUpdate({ _id }, req.body, { new: true })

        return _messages.success(res, req, profile, 'Atualização de dados')
    }
}
