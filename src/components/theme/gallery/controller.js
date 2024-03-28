const { Gallery } = require('./model')
const _messages = require('../../../utils/messages')
const { DOMAIN, AZURE_BLOB_URL } = process.env
const { azureBlob } = require('../../../utils/files')
const _functions = require('../../../utils/functions')

module.exports = {
    async create (req, res) {
        try {
            const body = JSON.parse(req.fields.body)
            const fileArray = Object.keys(req.files).map(key => req.files[key])


            const path = fileArray.findIndex(el => el.name === body.path)
            if (path >= 0) {
                let pathAzure = await azureBlob(fileArray[path], 'showcase/home', false, 'lmsassetsanon')
                body.path = pathAzure.replace(AZURE_BLOB_URL, DOMAIN)
            }


            gallery = await Gallery.create(body)


            return _messages.success(res, req, gallery)

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

            const total = await Gallery.find(
                searchBy
                    ? {
                        $or: [{ title: { $regex: searchBy, $options: 'i' } }],
                    }
                    : {}
            ).countDocuments();


            const data = await Gallery.find(
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

            _messages.success(res, req, { data, total, });
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
