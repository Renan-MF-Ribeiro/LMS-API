const { Theme } = require('./model')
const _messages = require('../../../utils/messages')
const { DOMAIN, AZURE_BLOB_URL } = process.env
const { azureBlob } = require('../../../utils/files')

module.exports = {
    async createOrUpdate (req, res) {
        try {
            const body = JSON.parse(req.fields.body)
            const fileArray = Object.keys(req.files).map(key => req.files[key])


            // const indexBG = fileArray.findIndex(el => el.name === body.background)
            // if (indexBG >= 0) {
            //     let pathBG = await azureBlob(fileArray[indexBG], 'showcase/home', false, 'lmsassetsanon')
            //     pathBG = pathBG.replace(AZURE_BLOB_URL, DOMAIN)
            //     body.background = pathBG
            // }
            // //img
            const logo = fileArray.findIndex(el => el.name === body.logo)
            if (logo >= 0) {

                let logoPath = await azureBlob(fileArray[logo], 'showcase/home', false, 'lmsassetsanon')
                logoPath = logoPath.replace(AZURE_BLOB_URL, DOMAIN)
                body.logo = logoPath
            }
            // //backgroundMobile
            // const backgroundMobile = fileArray.findIndex(el => el.name === body.backgroundMobile)
            // if (backgroundMobile >= 0) {

            //     let backgroundMobilePath = await azureBlob(fileArray[backgroundMobile], 'showcase/home', false, 'lmsassetsanon')
            //     backgroundMobilePath = backgroundMobilePath.replace(AZURE_BLOB_URL, DOMAIN)
            //     body.backgroundMobile = backgroundMobilePath
            // }

            let theme = await Theme.findOne({}).sort({ createdAt: -1 })

            if (theme) {
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
            const theme = await Theme.findOne({}).sort({ createdAt: -1 }).select('-createdAt -updatedAt -_id -__v -palette._id')
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
    }
}
