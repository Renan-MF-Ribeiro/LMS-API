const _messages = require('../../../utils/messages')
const _functions = require('../../../utils/functions')
const { TextArea_Showcase } = require('./model')
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

            const total = await TextArea_Showcase.find(query).countDocuments()

            const sections = await TextArea_Showcase.find(query)
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
                'TextArea_Showcase',
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

            const findSection = await TextArea_Showcase.find({ _id: sectionId })

            if (findSection.length) {


                if (fileArray) {

                    //bg
                    const indexBG = fileArray.findIndex(el => el.name === body.background)
                    if (indexBG >= 0) {

                        console.log(fileArray, indexBG)
                        let pathBG = await azureBlob(fileArray[indexBG], 'showcase/textArea', false, 'lmsassetsanon')
                        pathBG = pathBG.replace(AZURE_BLOB_URL, DOMAIN)
                        body.background = pathBG
                    }

                    //img
                    const indexIMG = fileArray.findIndex(el => el.name === body.imgPath)
                    if (indexIMG >= 0) {

                        console.log(fileArray, indexIMG)
                        let imgPath = await azureBlob(fileArray[indexIMG], 'showcase/textArea', false, 'lmsassetsanon')
                        imgPath = imgPath.replace(AZURE_BLOB_URL, DOMAIN)
                        body.imgPath = imgPath
                    }

                }

                await TextArea_Showcase.findOneAndUpdate({ _id: sectionId }, body)


            } else {
                return _messages.badRequest(
                    res,
                    req,
                    'Seção não encontrada',
                    'Esta seção não foi encontrado.',
                    'textArea_showcase',
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
                'textArea_showcase',
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
                let pathBG = await azureBlob(fileArray[indexBG], 'showcase/textArea', false, 'lmsassetsanon')
                pathBG = pathBG.replace(AZURE_BLOB_URL, DOMAIN)
                body.background = pathBG
                fileArray.splice(indexBG, 1)
            }
            //img
            const indexIMG = fileArray.findIndex(el => el.name === body.imgPath)
            if (indexIMG >= 0) {

                console.log(fileArray, indexIMG)
                let imgPath = await azureBlob(fileArray[indexIMG], 'showcase/textArea', false, 'lmsassetsanon')
                imgPath = imgPath.replace(AZURE_BLOB_URL, DOMAIN)
                body.imgPath = imgPath
            }
            const lastPosition = await Showcase.find().countDocuments()
            body.position = lastPosition
            body.type = DEFAULT_TYPES.text
            console.log(body)
            const textArea = await TextArea_Showcase.create(body)

            _messages.success(res, req, textArea, 'Seleção salva!')

        } catch (error) {
            console.error(error)
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'textArea_showcase',
                '/create',
            )
        }
    },

    async delete (req, res) {
        try {
            const { id } = req.params
            const findSection = await TextArea_Showcase.find({ _id: id })

            if (findSection.length) {
                await TextArea_Showcase.deleteOne({ _id: id })
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
