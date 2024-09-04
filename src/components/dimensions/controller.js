require('dotenv').config();
const { Dimension } = require('./model')
const {
    pagination,
    ordernation,
} = require('../../utils/functions');
const { azureBlob } = require('../../utils/files');
const _messages = require('../../utils/messages');
const { DOMAIN, AZURE_BLOB_URL } = process.env

module.exports = {
    async findAll (req, res) {
        try {
            const { skip, limit } = pagination(req);
            const { order, sort } = ordernation(req);
            const searchBy = req.query.searchBy;



            const query = searchBy
                ? {
                    $or: [
                        {
                            description: {
                                $regex: searchBy,
                                $options: 'i',
                            }
                        },

                        {
                            title: {
                                $regex: searchBy,
                                $options: 'i',
                            },
                        },
                    ],

                }
                : {}

            query['deleted'] = { $ne: true }
            const total = await Dimension.find(query).countDocuments();

            const data = await Dimension.find(query)
                .sort({ [order]: sort })
                .skip(parseInt(skip))
                .limit(limit);



            _messages.success(res, req, {
                data,
                total,
            });

        } catch (error) {
            console.error(error)
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'dimensions',
                'findAll'
            );
        }
    },

    async findAllEnabled (req, res) {
        try {

            const data = await Dimension.find({ enabled: true, deleted: { $ne: true } })

            _messages.success(res, req, data);

        } catch (error) {
            console.error(error)
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'dimensions',
                'findAll'
            );
        }
    },

    async create (req, res) {
        try {

            const payload = JSON.parse(req.fields.payload) ?? null;
            const { thumb } = req.files;

            if (thumb) {
                payload.thumbPath = await azureBlob(thumb, 'dimensions/thumbs');
                if (process.env.NODE_ENV !== 'local') {
                    payload.thumbPath = payload.thumbPath.replace(
                        AZURE_BLOB_URL,
                        DOMAIN
                    );
                }
            }

            const dimension = await Dimension.create(payload)

            _messages.success(
                res,
                req,
                { _id: dimension._id },
                'Criação de dados',
                'dimensions',
                'create',
                dimension,
                [],
                true,
                'CREATE'
            );
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'dimensions',
                'create'
            );
        }
    },

    async update (req, res) {
        try {
            console.log(req.files)
            const { thumb } = req.files;
            const payload = JSON.parse(req.fields.payload) ?? null;

            const { _id } = payload

            const verify = await Dimension.find({
                title: { $eq: payload.title },
                _id: { $ne: _id },
            })
            if (verify.length === 0) {
                if (thumb) {
                    payload.thumbPath = await azureBlob(thumb, 'dimensions/thumbs')
                    if (process.env.NODE_ENV !== 'local') {
                        payload.thumbPath = thumbPath.replace(
                            AZURE_BLOB_URL,
                            DOMAIN,
                        )
                    }
                }
                delete payload.thumb

                const oldData = await Dimension.updateOne(
                    { _id: { $eq: payload._id } },
                    payload,
                )
                const newData = await Dimension.findOne({
                    _id: { $eq: payload._id },
                })

                _messages.success(
                    res,
                    req,
                    newData,
                    'Atualização de dados',
                    'dimensions',
                    'update',
                    newData,
                    oldData,
                    true,
                    'UPDATE',
                )
            } else {
                _messages.badRequest(
                    res,
                    req,
                    'Já existe uma dimensão cadastrada com esse título',
                    'Já existe uma dimensão cadastrada com esse título',
                    'dimensions',
                    'update',
                    '5d9f22722cefc7329473e5c5',
                )
            }

        } catch (error) {
            console.log(error)
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'dimensions',
                'update',
            )
        }
    },

    async changeStatus (req, res) {
        try {
            const { _id, enabled } = req.body;

            if (!_id) {
                throw new Error('Did not pass _id');
            }

            if (enabled === null || enabled === undefined) {
                throw new Error('Did not pass enabled');
            }

            const oldData = await Dimension.updateOne(
                { _id: { $eq: _id } },
                { enabled: enabled }
            );
            const newData = await Dimension.find({ _id: { $eq: _id } });

            _messages.success(
                res,
                req,
                newData,
                'Atualização de status',
                'dimensions',
                'update',
                newData,
                oldData,
                true,
                'UPDATE'
            );
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'dimensions',
                'change-status'
            );
        }
    },

    async delete (req, res) {
        try {
            const { _id } = req.params

            // soft delete
            await Dimension.updateOne({ _id }, { $set: { deleted: true } });

            return _messages.success(res, req, 'Removido com sucesso')
        }
        catch (error) {
            console.error(error)
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'theme',
                'createOrUpdate',
            )
        }
    }
}
