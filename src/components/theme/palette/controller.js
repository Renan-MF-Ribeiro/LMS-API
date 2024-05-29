const { Theme } = require('./model')
const _messages = require('../../../utils/messages')
const { DOMAIN, AZURE_BLOB_URL } = process.env
const { azureBlob } = require('../../../utils/files')

module.exports = {
    async createOrUpdate (req, res) {
        try {
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


            let theme = await Theme.findOne({ defaultPalette: false }).sort({ createdAt: 1 })

            if (theme && !body.defaultPalette) {
                theme = await Theme.findByIdAndUpdate(theme._id, body, { new: true })
            } else {
                theme = await Theme.create(body)
            }

            return _messages.success(res, req, theme)

        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'theme',
                'createOrUpdate',
            )
        }

    },

    async getTheme (req, res) {
        try {
            const theme = await Theme.findOne({ defaultPalette: { $ne: true } }).sort({ createdAt: -1 }).select('-createdAt -updatedAt -_id -__v -palette._id')
            if (theme) {

                return _messages.success(res, req, theme)
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
                'theme',
                'getTheme',
            )
        }
    },

    async getDefaultTheme (req, res) {
        try {
            const theme = await Theme.findOne({ defaultPalette: { $eq: true } }).sort({ createdAt: -1 }).select('-createdAt -updatedAt -_id -__v -palette._id')
            return _messages.success(res, req, theme)
            if (theme) {

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
                'theme',
                'getTheme',
            )
        }
    }
}
