const { Welcome } = require('./model')
const _messages = require('../../../utils/messages')
const { uploadVimeo } = require('../../../utils/files')

module.exports = {
    async getConfig (req, res) {
        try {
            const welcome = await Welcome.findOne({ deleted: { $ne: true } }).select('-createdAt -updatedAt -__v ')
            return _messages.success(res, req, welcome)
        } catch (error) {
            console.error(error)
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'welcome',
                'getConfig',
            )
        }
    },

    async CreateOrUpdate (req, res) {
        try {
            const body = JSON.parse(req.fields.body)
            const fileArray = Object.keys(req.files).map(key => req.files[key])
            const welcome = await Welcome.findOne({ deleted: { $ne: true } })
            if (welcome) {
                const welcomeVideo = fileArray.findIndex(el => el.name === body.welcomeVideo)
                if (welcomeVideo >= 0) {
                    let welcomeVideoPath = await uploadVimeo(fileArray[welcomeVideo], body._id)
                    body.welcomeVideo = welcomeVideoPath
                }
                await Welcome.findByIdAndUpdate(welcome._id, welcome)
            } else {
                const newWelcome = await Welcome.create(req.body)
                console.log(newWelcome)
                const welcomeVideo = fileArray.findIndex(el => el.name === body.welcomeVideo)
                if (welcomeVideo >= 0) {
                    let welcomeVideoPath = await uploadVimeo(fileArray[welcomeVideo], newWelcome._id)
                    body.welcomeVideo = welcomeVideoPath
                }
            }

            return _messages.success(res, req, welcome)

        }
        catch (error) {
            console.error(error)
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'welcome',
                'createOrUpdate',
            )
        }
    }
}