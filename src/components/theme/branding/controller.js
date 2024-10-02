const { Branding } = require('./model')
const _messages = require('../../../utils/messages')
const { DOMAIN, AZURE_BLOB_URL } = process.env
const { azureBlob } = require('../../../utils/files')

module.exports = {
    async update (req, res) {
        try {
            const body = JSON.parse(req.fields.body)
            const favicon = req.files.favicon

            if (favicon) {
                const faviconPath = await azureBlob(favicon, 'showcase/home', false, 'lmsassetsanon')
                body.favicon = faviconPath.replace(AZURE_BLOB_URL, DOMAIN)
            }
            console.log(body)

            let branding = await Branding.findOne({}).sort({ createdAt: -1 })
            if (branding) {
                branding = await Branding.findByIdAndUpdate(branding._id, body, { new: true })
            } else {
                branding = await Branding.create(req.body)
            }

            return _messages.success(res, req, branding)

        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'branding',
                'createOrUpdate',
            )
        }

    },

    async getBranding (req, res) {
        try {
            const data = await Branding.findOne({})
            _messages.success(res, req, data);
        }
        catch (error) {
            console.error(error)
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'Branding',
                'getBranding',
            )
        }
    }
}
