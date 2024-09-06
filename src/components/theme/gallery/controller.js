const { MyGallery } = require('./model')
const _messages = require('../../../utils/messages')
const { DOMAIN, AZURE_BLOB_URL } = process.env
const { azureBlob } = require('../../../utils/files')
const _functions = require('../../../utils/functions')

module.exports = {
    async create (req, res) {
        try {
            const body = { target: req.fields.target }
            const file = req.files.file


            if (file) {
                let pathAzure = await azureBlob(file, 'showcase/home', false, 'lmsassetsanon')
                body.url = pathAzure.replace(AZURE_BLOB_URL, DOMAIN)
            }

            // gallery = await MyGallery.create(body)

            return _messages.success(res, req)

        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'myGallery',
                'createOrUpdate',
            )
        }

    },

    async list (req, res) {
        try {
            const { sort, order } = _functions.ordernation(req);
            const { skip, limit } = _functions.pagination(req);
            const searchBy = req.query.searchBy;
            const query = searchBy
                ? {
                    $or: [{ title: { $regex: searchBy, $options: 'i' } }],
                }
                : {}

            const total = await MyGallery.find(query).countDocuments();
            const data = await MyGallery.find(query)
                .sort({
                    [order]: sort,
                })
                .skip(parseInt(skip))
                .limit(parseInt(limit));

            return _messages.success(res, req, { data, total, });
        }
        catch (error) {
            console.error(error)
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'Gallery',
                'listGallery',
            )
        }
    },

    async setDefault (req, res) {
        try {
            const imageId = req.body
            const image = await MyGallery.findById(imageId)

            await MyGallery.updateMany({ target: image.target }, { $set: { default: false } });

            await MyGallery.updateOne({ _id: image._id }, { $set: { default: true } });

            return _messages.success(res, req, image)

        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'myGallery',
                'setDefault',
            )
        }
    }
}
