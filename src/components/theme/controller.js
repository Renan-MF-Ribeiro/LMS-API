const { ThemeLogin } = require('./model')
const _messages = require('../../utils/messages')
const { DOMAIN, AZURE_BLOB_URL } = process.env
const { azureBlob } = require('../../utils/files')

module.exports = {
    async createOrUpdate (req, res) {
        try {
            const body = JSON.parse(req.fields.body)
            const fileArray = Object.keys(req.files).map(key => req.files[key])


            const indexBG = fileArray.findIndex(el => el.name === body.background)
            if (indexBG >= 0) {
                let pathBG = await azureBlob(fileArray[indexBG], 'showcase/home', false, 'lmsassetsanon')
                pathBG = pathBG.replace(AZURE_BLOB_URL, DOMAIN)
                body.background = pathBG
            }
            //img
            const logo = fileArray.findIndex(el => el.name === body.logo)
            if (logo >= 0) {

                let logoPath = await azureBlob(fileArray[logo], 'showcase/home', false, 'lmsassetsanon')
                logoPath = logoPath.replace(AZURE_BLOB_URL, DOMAIN)
                body.logo = logoPath
            }

            const theme = await ThemeLogin.create(body)


            _messages.success(res, req, theme)
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'ImageArea_Showcase',
                'get',
            )
        }
    }
}
