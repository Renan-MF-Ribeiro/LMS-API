const _messages = require('../../utils/messages');
const _functions = require('../../utils/functions');
const { Channel } = require('./model');
const { azureBlob } = require('../../utils/files');
const { DOMAIN, AZURE_BLOB_URL } = process.env;
const { getTagsElegiblesByToken } = require('../sections/business');
module.exports = {
    async getChannels(req, res) {
        try {
            const { sort, order } = _functions.ordernation(req);
            const { skip, limit } = _functions.pagination(req);
            const searchBy = req.query.searchBy;
            const total = await Channel.find(
                searchBy
                    ? {
                          $or: [{ title: { $regex: searchBy, $options: 'i' } }],
                      }
                    : {}
            ).countDocuments();

            const channels = await Channel.find(
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

            _messages.success(res, req, {
                data: channels,
                total,
            });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'channels',
                'get'
            );
        }
    },
    async getChannelsElegibles(req, res) {
        const tags = await getTagsElegiblesByToken(req);
        try {
            const channels = await Channel.find({
                tags: { $in: tags.map((tag) => tag.value) },
                enabled: true,
            }).sort({ position: 'asc' });

            _messages.success(res, req, channels);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'channels',
                'get'
            );
        }
    },

    async create(req, res) {
        try {
            let body = JSON.parse(req.fields.payload);

            let fileArray = Object.keys(req.files).map((key) => req.files[key]);

            for (let i in body.banners) {
                let path = await azureBlob(fileArray[i], 'channels/banners');
                body.banners[i].path = path;
            }

            const findChannel = await Channel.find({ title: body.title });

            if (findChannel.length) {
                return _messages.forbidden(
                    res,
                    req,
                    'Registro duplicado',
                    'Este canal já está cadastrado.',
                    'channels',
                    'create'
                );
            }

            const channel = await Channel.create(body);
            _messages.success(
                res,
                req,
                channel,
                'Criação de dados',
                'channels',
                'create',
                channel,
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
                'channels',
                '/create'
            );
        }
    },

    async update(req, res) {
        try {
            let body = JSON.parse(req.fields.payload);
            const channelId = body.channelId;
            delete body.channelId;

            if (Object.keys(req.files).length !== 0) {
                let fileArray = Object.keys(req.files).map(
                    (key) => req.files[key]
                );

                let indexBannersWithNoPath = body.banners.reduce(function (
                    r,
                    v,
                    i
                ) {
                    return r.concat(typeof v.path != 'string' ? i : []);
                },
                []);

                for (let index in indexBannersWithNoPath) {
                    let path = await azureBlob(
                        fileArray[index],
                        'channels/banners'
                    );
                    body.banners[indexBannersWithNoPath[index]].path = path;
                }
            }

            const findChannel = await Channel.find({ _id: channelId });

            if (findChannel.length) {
                await Channel.findOneAndUpdate({ _id: channelId }, body);
                _messages.success(res, req, 'Canal Atualizado!');
            } else {
                return _messages.badRequest(
                    res,
                    req,
                    'Canal não encontrado',
                    'Este canal não foi encontrado.',
                    'channels',
                    'update'
                );
            }
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'channels',
                '/create'
            );
        }
    },

    async delete(req, res) {
        try {
            const findChannel = await Channel.find({ _id: req.params.id });
            if (findChannel.length) {
                await Channel.findOneAndDelete({ _id: req.params.id });
                _messages.success(res, req, 'Canal Deletado!');
            } else {
                return _messages.badRequest(
                    res,
                    req,
                    'Canal não encontrado',
                    'Este canal não foi encontrado.',
                    'channels',
                    'delete'
                );
            }
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'channels',
                '/create'
            );
        }
    },

    async updatePosition(req, res) {
        try {
            const channels = req.body;

            for (const channel of channels) {
                const { id, position } = channel;
                await Channel.findByIdAndUpdate(id, { position });
            }

            _messages.success(res, req, 'Atualizado com sucesso!');
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'channels',
                '/updatePosition'
            );
        }
    },
};
