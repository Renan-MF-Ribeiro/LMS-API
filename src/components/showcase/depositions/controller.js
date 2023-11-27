const _messages = require('../../../utils/messages')
const _functions = require('../../../utils/functions')
const { Depositions_Showcase } = require('./model')
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

            const total = await Depositions_Showcase.find(query).countDocuments()

            const sections = await Depositions_Showcase.find(query)
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
                'Depositions_Showcase',
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

            const findSection = await Depositions_Showcase.find({ _id: sectionId })

            if (findSection.length) {


                if (fileArray) {

                    //bg
                    const indexBG = fileArray.findIndex(el => el.name === body.background)
                    if (indexBG >= 0) {

                        console.log(fileArray, indexBG)
                        let pathBG = await azureBlob(fileArray[indexBG], 'showcase/depositions')
                        pathBG = pathBG.replace(AZURE_BLOB_URL, DOMAIN)
                        body.background = pathBG
                    }

                }

                await Depositions_Showcase.findOneAndUpdate({ _id: sectionId }, body)


            } else {
                return _messages.badRequest(
                    res,
                    req,
                    'Seção não encontrada',
                    'Esta seção não foi encontrado.',
                    'depositions_showcase',
                    'update',
                )
            }

            _messages.success(res, req, 'Imagem salva!')

        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'depositions_showcase',
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
                let pathBG = await azureBlob(fileArray[indexBG], 'showcase/depositions')
                pathBG = pathBG.replace(AZURE_BLOB_URL, DOMAIN)
                body.background = pathBG
                fileArray.splice(indexBG, 1)
            }

            for (const file of fileArray) {
                let path = await azureBlob(file, 'showcase/depositions/profile')
                path = path.replace(AZURE_BLOB_URL, DOMAIN)
                const index = body.depositions.findIndex((el) => el.profile == file.name)
                body.depositions[index].profile = path
            }
            const lastPosition = await Showcase.find().countDocuments()
            body.position = lastPosition
            body.type = DEFAULT_TYPES.depositions

            const depositions = await Depositions_Showcase.create(body)

            _messages.success(res, req, depositions, 'Imagem salva!')

        } catch (error) {
            console.error(error)
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'depositions_showcase',
                '/create',
            )
        }
    },

    async delete (req, res) {
        try {
            const { id } = req.params
            const findSection = await Depositions_Showcase.find({ _id: id })

            if (findSection.length) {
                await Depositions_Showcase.deleteOne({ _id: id })
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
