const { Theme } = require('./model')
const _messages = require('../../../utils/messages')
const { DOMAIN, AZURE_BLOB_URL } = process.env
const { azureBlob } = require('../../../utils/files')
const { pagination } = require('../../../utils/functions')
const { removeFromCache } = require('../../../utils/cache/store')


module.exports = {
    async list(req, res) {
        const { skip, limit } = pagination(req);
        const searchBy = req.query.searchBy;
        const listAll = req.query.listAll;
        const query = {
            deleted: { $ne: true },
            __t: { $exists: false }//, // exclude subtypes
        }
        if (searchBy) query['title'] = { $regex: searchBy, $options: 'i' }

        const total = await Theme.find(query).count();
        const themes = await Theme.find(query)
            .skip(parseInt(skip))
            .sort({ createdAt: -1 })
            .limit(listAll ? 0 : parseInt(limit));

        return _messages.success(res, req, { data: themes, total })
    },

    async createOrUpdate(req, res) {
        const body = JSON.parse(req.fields.body)
        const fileArray = Object.keys(req.files).map(key => req.files[key])

        const logo = fileArray.findIndex(el => el.name === body.logo)
        if (logo >= 0) {

            let logoPath = await azureBlob(fileArray[logo], 'showcase/home', false, 'lmsassetsanon')
            logoPath = logoPath.replace(AZURE_BLOB_URL, DOMAIN)
            body.logo = logoPath
        }

        const logo_admin = fileArray.findIndex(el => el.name === body.logo_admin)
        if (logo_admin >= 0) {

            let logo_adminPath = await azureBlob(fileArray[logo_admin], 'showcase/home', false, 'lmsassetsanon')
            logo_adminPath = logo_adminPath.replace(AZURE_BLOB_URL, DOMAIN)
            body.logo_admin = logo_adminPath
        }

        const favicon = fileArray.findIndex(el => el.name === body.favicon)
        if (favicon >= 0) {

            let faviconPath = await azureBlob(fileArray[favicon], 'showcase/home', false, 'lmsassetsanon')
            faviconPath = faviconPath.replace(AZURE_BLOB_URL, DOMAIN)
            body.favicon = faviconPath
        }

        let theme

        if (body._id) {

            if (body.enabled) {
                await Theme.updateMany({}, { $set: { enabled: false } });
            }

            theme = await Theme.findByIdAndUpdate(body._id, body, { new: true })

        } else {
            theme = await Theme.create(body)
        }

        removeFromCache('/theme/palette');

        return _messages.success(res, req, theme)
    },

    async getTheme(req, res) {
        const theme = await Theme.findOne({ enabled: true }).select('-createdAt -updatedAt -__v -palette._id')

        if (theme) {

            return _messages.success(res, req, theme)
        }

        return _messages.conflict(
            res,
            req,
            null,
            'Erro interno no servidor',
            'theme',
            'getTheme'
        )
    },

    async getDefaultTheme(req, res) {
        let theme = await Theme.findOne({ enabled: { $eq: true }, __t: { $exists: false } }).sort({ createdAt: -1 }).select('-createdAt -updatedAt -__v -palette._id')

        if (!theme) {
            theme = await Theme.findOne({ __t: { $exists: false } }).sort({ createdAt: -1 }).select('-createdAt -updatedAt -__v -palette._id')
        }

        return _messages.success(res, req, theme)
    },

    async changeEnable(req, res) {
        const { _id } = req.body

        await Theme.updateMany({}, { $set: { enabled: false } });

        // 2. Definir o documento com o id recebido como enabled: true
        await Theme.updateOne({ _id }, { $set: { enabled: true } });

        return _messages.success(res, req, 'Atualizado com sucesso')
    },

    async delete(req, res) {
        const { _id } = req.params

        // soft delete
        await Theme.updateOne({ _id }, { $set: { deleted: true } });

        return _messages.success(res, req, 'Removido com sucesso')
    },

    async duplicateTheme(req, res) {
        const { _id } = req.body

        const theme = await Theme.findById(_id)

        const newTheme = {
            ...theme.toObject(),
            _id: null,
            name: `${theme.name} - Cópia`,
            enabled: false,
            createdAt: new Date(),
            updatedAt: new Date()
        }

        delete newTheme.welcomeVideo;

        const newThemeDoc = await Theme.create(newTheme)

        return _messages.success(res, req, newThemeDoc)
    }
}