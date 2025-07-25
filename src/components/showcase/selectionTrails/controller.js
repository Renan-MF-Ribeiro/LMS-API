const _messages = require('../../../utils/messages')
const _functions = require('../../../utils/functions')
const { Selection_Showcase } = require('./model')
const { DOMAIN, AZURE_BLOB_URL } = process.env
const { azureBlob } = require('../../../utils/files')
const { DEFAULT_TYPES, Showcase } = require('../configuration/model')
const { Trail } = require('../../trails/model')
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

            const total = await Selection_Showcase.find(query).countDocuments()

            const sections = await Selection_Showcase.find(query)
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
                'Selection_Showcase',
                'get',
            )
        }
    },

    async getListTrails (req, res) {
        try {
            const { order, sort } = _functions.ordernation(req)
            const { skip, limit } = _functions.pagination(req)
            const searchBy = req.query.searchBy

            let total = 0
            const today = new Date();
            const query = searchBy
                ? {
                    $or: [
                        {
                            description: {
                                $regex: searchBy,
                                $options: 'i',
                            },
                        },
                        {
                            title: {
                                $regex: searchBy,
                                $options: 'i',
                            },
                        },
                    ],
                    enabled: true,
                    startDate: { $lt: today }, // startDate seja menor do que hoje
                    endDate: { $gt: today }, // endDate seja maior do que hoje
                }
                : {
                    enabled: true,
                    startDate: { $lt: today }, // startDate seja menor do que hoje
                    endDate: { $gt: today }, // endDate seja maior do que hoje
                }

            total = await Trail.find(query).countDocuments()

            const trails = await Trail.find(query)
                .sort({ [order]: sort })
                .skip(parseInt(skip))
                .limit(parseInt(limit))

            _messages.success(res, req, {
                data: trails,
                total,
            })

        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'trails',
                'findAll',
            )
        }
    },

    async update (req, res) {
        try {
            const body = JSON.parse(req.fields.body)
            const fileArray = Object.keys(req.files).map(key => req.files[key])
            const sectionId = body._id
            delete body.sectionId

            const findSection = await Selection_Showcase.find({ _id: sectionId })

            if (findSection.length) {


                if (fileArray) {

                    const indexBG = fileArray.findIndex(el => el.name === body.background)
                    if (indexBG >= 0) {

                        // console.log(fileArray, indexBG)
                        let pathBG = await azureBlob(fileArray[indexBG], 'showcase/selection', false, 'lmsassetsanon')
                        pathBG = pathBG.replace(AZURE_BLOB_URL, DOMAIN)
                        body.background = pathBG
                    }

                }

                await Selection_Showcase.findOneAndUpdate({ _id: sectionId }, body)


            } else {
                return _messages.badRequest(
                    res,
                    req,
                    'Seção não encontrada',
                    'Esta seção não foi encontrado.',
                    'selection_showcase',
                    'update',
                )
            }

            _messages.success(res, req, 'Seleção salva!')

        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'selection_showcase',
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

                let pathBG = await azureBlob(fileArray[indexBG], 'showcase/selection', false, 'lmsassetsanon')
                pathBG = pathBG.replace(AZURE_BLOB_URL, DOMAIN)
                body.background = pathBG
                fileArray.splice(indexBG, 1)
            }

            const lastPosition = await Showcase.find().countDocuments()
            body.position = lastPosition
            body.type = DEFAULT_TYPES.selection
            const selection = await Selection_Showcase.create(body)

            _messages.success(res, req, selection, 'Seleção salva!')

        } catch (error) {
            console.error(error)
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'selection_showcase',
                '/create',
            )
        }
    },

    async delete (req, res) {
        try {
            const { id } = req.params
            const findSection = await Selection_Showcase.find({ _id: id })

            if (findSection.length) {
                await Selection_Showcase.deleteOne({ _id: id })
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
