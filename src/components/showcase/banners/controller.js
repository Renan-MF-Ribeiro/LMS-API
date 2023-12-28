const _messages = require('../../../utils/messages')
const _functions = require('../../../utils/functions')
const { Banners_Showcase } = require('./model')
const { DOMAIN, AZURE_BLOB_URL } = process.env
const { azureBlob } = require('../../../utils/files')
const { DEFAULT_TYPES, Showcase } = require('../configuration/model')

module.exports = {
    async getList (req, res) {
        try {
            const { sort, order } = _functions.ordernation(req)
            const { skip, limit } = _functions.pagination(req)
            const searchBy = req.query.searchBy
            const query = searchBy
                ? {
                    $or: [{ title: { $regex: searchBy, $options: 'i' } }],
                }
                : {}

            const total = await Banners_Showcase.find(query).countDocuments()

            const sections = await Banners_Showcase.find(query)
                .sort({
                    [order]: sort,
                })
                .skip(parseInt(skip))
                .limit(parseInt(limit))

            _messages.success(res, req, {
                data: sections,
                total,
            })
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'Banners_Showcase',
                'get',
            )
        }
    },

    async update (req, res) {
        try {
            const body = JSON.parse(req.fields.body)
            const fileArray = Object.keys(req.files).map(key => req.files[key])
            const sectionId = body._id
            delete body.sectionId

            const findSection = await Banners_Showcase.find({ _id: sectionId })

            if (findSection.length) {

                for (const file of fileArray) {
                    let path = await azureBlob(file, 'showcase/banners', false, 'lmsassetsanon')
                    path = path.replace(AZURE_BLOB_URL, DOMAIN)
                    const index = body.banners.findIndex((el) => el.path == file.name)
                    body.banners[index].path = path
                }

                await Banners_Showcase.findOneAndUpdate({ _id: sectionId }, body)
            } else {
                return _messages.badRequest(
                    res,
                    req,
                    'Seção não encontrada',
                    'Esta seção não foi encontrado.',
                    'banners_showcase',
                    'update',
                )
            }
            _messages.success(res, req, 'Seção Atualizada!')
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'banners_showcase',
                '/update',
            )
        }
    },

    async create (req, res) {
        try {
            const body = JSON.parse(req.fields.body)
            const fileArray = Object.keys(req.files).map(key => req.files[key])

            for (const file of fileArray) {
                let path = await azureBlob(file, 'showcase/banners', false, 'lmsassetsanon')
                path = path.replace(AZURE_BLOB_URL, DOMAIN)
                const index = body.banners.findIndex((el) => el.path == file.name)
                body.banners[index].path = path
            }
            const lastPosition = await Showcase.find().countDocuments()
            body.position = lastPosition
            body.type = DEFAULT_TYPES.banners
            const banner = await Banners_Showcase.create(body)

            _messages.success(res, req, banner, 'Banners salvos!')

        } catch (error) {
            console.error(error)
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'banners_showcase',
                '/create',
            )
        }
    },

    async delete (req, res) {
        try {
            const { id } = req.params
            const findSection = await Banners_Showcase.find({ _id: id })

            if (findSection.length) {
                await Banners_Showcase.deleteOne({ _id: id })
            } else {
                return _messages.badRequest(
                    res,
                    req,
                    'Seção não encontrada',
                    'Esta seção não foi encontrado.',
                    'videos_showcase',
                    'update',
                )
            }
            _messages.success(res, req, 'Seção removida!')
        } catch (error) {
            console.error(error)
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'videos_showcase',
                '/create',
            )
        }
    }
}
