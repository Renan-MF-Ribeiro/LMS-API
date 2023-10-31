const _messages = require('../../../utils/messages')
const _functions = require('../../../utils/functions')
const { Videos_Showcase } = require('./model')
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

            const total = await Videos_Showcase.find(query).countDocuments()

            const sections = await Videos_Showcase.find(query)
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
                'Videos_Showcase',
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

            const findSection = await Videos_Showcase.find({ _id: sectionId })

            if (findSection.length) {


                if (fileArray) {

                    const indexBG = fileArray.findIndex(el => el.name === body.background)
                    if (indexBG >= 0) {

                        console.log(fileArray, indexBG)
                        let pathBG = await azureBlob(fileArray[indexBG], 'showcase/videos')
                        pathBG = pathBG.replace(AZURE_BLOB_URL, DOMAIN)
                        body.background = pathBG
                        fileArray.splice(indexBG, 1)
                    }

                    for (const file of fileArray) {
                        let path = await azureBlob(file, 'showcase/videos')
                        path = path.replace(AZURE_BLOB_URL, DOMAIN)
                        console.log(body)
                        const index = body.videos.findIndex((el) => el.path == file.name)
                        console.log(index)
                        body.videos[index].path = path
                    }
                }

                await Videos_Showcase.findOneAndUpdate({ _id: sectionId }, body)


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

            _messages.success(res, req, 'Videos salvos!')

        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'videos_showcase',
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
                let pathBG = await azureBlob(fileArray[indexBG], 'showcase/videos')
                pathBG = pathBG.replace(AZURE_BLOB_URL, DOMAIN)
                body.background = pathBG
                fileArray.splice(indexBG, 1)
            }

            for (const file of fileArray) {
                let path = await azureBlob(file, 'showcase/videos')
                path = path.replace(AZURE_BLOB_URL, DOMAIN)
                console.log(body)
                const index = body.videos.findIndex((el) => el.path == file.name)
                console.log(index)
                body.videos[index].path = path
            }
            const lastPosition = await Showcase.find().countDocuments()
            body.position = lastPosition
            body.type = DEFAULT_TYPES.videos
            const videos = await Videos_Showcase.create(body)

            _messages.success(res, req, videos, 'Videos salvos!')

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
