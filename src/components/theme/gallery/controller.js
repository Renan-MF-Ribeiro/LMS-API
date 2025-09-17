const { MyGallery } = require('./model');
const _messages = require('../../../utils/messages');
const { DOMAIN, AZURE_BLOB_URL } = process.env;
const { azureBlob } = require('../../../utils/files');
const _functions = require('../../../utils/functions');
const mongoose = require('mongoose');

module.exports = {
    async create(req, res) {
        try {
            const body = {};
            const file = req.files.file;


            if (file) {
                let pathAzure = await azureBlob(file, 'showcase/home', false, 'lmsassetsanon');
                body.url = pathAzure.replace(AZURE_BLOB_URL, DOMAIN);
            }

            gallery = await MyGallery.create(body);

            return _messages.success(res, req);

        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'myGallery',
                'createOrUpdate'
            );
        }

    },

    async list(req, res) {
        try {
            const { sort, order } = _functions.ordernation(req);
            const { skip, limit } = _functions.pagination(req);
            const searchBy = req.query.searchBy;
            const baseQuery = { $or: [  { deletedAt: null },  { deletedAt: { $exists: false } }] };
            const query = searchBy
                ? {
                    $and: [
                        baseQuery,
                        { $or: [{ title: { $regex: searchBy, $options: 'i' } }] }
                    ]
                }
                : baseQuery;

            const total = await MyGallery.find(query).countDocuments();
            const data = await MyGallery.find(query)
                .sort({
                    [order]: sort
                })
                .skip(parseInt(skip))
                .limit(parseInt(limit));

            return _messages.success(res, req, { data, total });
        } catch (error) {
            console.error(error);
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'Gallery',
                'listGallery'
            );
        }
    },

    async setDefault(req, res) {
        try {
            const imageId = req.body;
            const image = await MyGallery.findOne({ _id: imageId, deletedAt: { $exists: false } });

            if (!image) {
                return _messages.notFound(res, req, 'Image not found or has been deleted');
            }

            await MyGallery.updateMany(
                { target: image.target, deletedAt: { $exists: false } },
                { $set: { default: false } }
            );

            await MyGallery.updateOne({ _id: image._id }, { $set: { default: true } });

            return _messages.success(res, req, image);

        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'myGallery',
                'setDefault'
            );
        }
    },

    async deleteImage(req, res) {
        try {
            const { imageId } = req.params;
            const image = await MyGallery.findByIdAndUpdate(imageId, { $set: { deletedAt: new Date() } }, { new: true });

            return _messages.success(res, req, image);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'myGallery',
                'deleteImage'
            );
        }
    }
};
