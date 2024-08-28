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

            gallery = await MyGallery.create(body)


            return _messages.success(res, req,)

        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'theme',
                'createOrUpdate',
            )
        }

    },

    async list (req, res) {
        try {
            const { sort, order } = _functions.ordernation(req);
            const { skip, limit } = _functions.pagination(req);
            const searchBy = req.query.searchBy;

            const total = await MyGallery.find(
                searchBy
                    ? {
                        $or: [{ title: { $regex: searchBy, $options: 'i' } }],
                    }
                    : {}
            ).countDocuments();


            const data = await MyGallery.find(
                searchBy
                    ? {
                        $or: [{ title: { $regex: searchBy, $options: 'i' } }],
                    }
                    : {}
            )
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
    }
}
