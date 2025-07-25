const _messages = require('../../../utils/messages')
const _functions = require('../../../utils/functions')
const { MostView_Showcase } = require('./model')
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

            const total = await MostView_Showcase.find(query).countDocuments()

            const sections = await MostView_Showcase.find(query)
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
                'MostView_Showcase',
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

            const findSection = await MostView_Showcase.find({ _id: sectionId })

            if (findSection.length) {


                if (fileArray) {

                    const indexBG = fileArray.findIndex(el => el.name === body.background)
                    if (indexBG >= 0) {

                        // console.log(fileArray, indexBG)
                        let pathBG = await azureBlob(fileArray[indexBG], 'showcase/mostView')
                        pathBG = pathBG.replace(AZURE_BLOB_URL, DOMAIN)
                        body.background = pathBG
                    }

                }

                await MostView_Showcase.findOneAndUpdate({ _id: sectionId }, body)


            } else {
                return _messages.badRequest(
                    res,
                    req,
                    'Seção não encontrada',
                    'Esta seção não foi encontrado.',
                    'mostView_showcase',
                    'update',
                )
            }

            _messages.success(res, req, 'MostView salvos!')

        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'mostView_showcase',
                '/update',
            )
        }
    },

    async create (req, res) {
        try {
            const body = JSON.parse(req.fields.body)
            const fileArray = Object.keys(req.files).map(key => req.files[key])


            const indexBG = fileArray.findIndex(el => el.name === body.background)
            if (indexBG >= 0) {

                let pathBG = await azureBlob(fileArray[indexBG], 'showcase/mostView')
                pathBG = pathBG.replace(AZURE_BLOB_URL, DOMAIN)
                body.background = pathBG
                fileArray.splice(indexBG, 1)
            }

            const lastPosition = await Showcase.find().countDocuments()
            // console.log(lastPosition)
            body.position = lastPosition
            body.type = DEFAULT_TYPES.mostSeen
            const mostView = await MostView_Showcase.create(body)
            _messages.success(res, req, mostView, 'MostView salvos!')

        } catch (error) {
            console.error(error)
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'mostView_showcase',
                '/create',
            )
        }
    },

    async delete (req, res) {
        try {
            const { id } = req.params
            const findSection = await MostView_Showcase.find({ _id: id })

            if (findSection.length) {
                await MostView_Showcase.deleteOne({ _id: id })
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
