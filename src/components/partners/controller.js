const { DOMAIN, AZURE_BLOB_URL } = process.env;
const moment = require('moment');
const _messages = require('../../utils/messages');
const { azureBlob } = require('../../utils/files');
const { Partner } = require('./model');
const { pagination, ordernation, getUserByToken } = require('../../utils/functions');
const { User } = require('../users/model');
const { handleSegmentationOnQuery } = require('../config/business');
const { getDefaultForm } = require('../forms/business');

module.exports = {
    async getPartners(req, res) {
        const { skip, limit } = pagination(req);
        const { order, sort } = ordernation(req);
        const searchBy = req.query.searchBy;

        const query = { $and: [{}] }

        if(searchBy) {
            query.$and.push({
                $or: [{ title: { $regex: searchBy, $options: 'i' } }]
            })
        }

        if(req?.segmentation) {
            handleSegmentationOnQuery(req, 'owner', query)
        }

        try {
            const total = await Partner.find(query).countDocuments();
            const partners = await Partner.find(query)
                .sort({
                    [order]: sort,
                })
                .skip(parseInt(skip))
                .limit(parseInt(limit));

            _messages.success(res, req, {
                data: partners,
                total,
            });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'partners',
                'getPartners'
            );
        }
    },

    async getActivePartners(req, res) {
        try {
            const partners = await Partner.find({ active: true });

            _messages.success(res, req, partners);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'partners',
                'getActivePartners'
            );
        }
    },

    async create(req, res) {
        const body = JSON.parse(req.fields.payload) ?? null;
        const { title, initialDate, endDate } = body;
        const { logo } = req.files ?? '';
        const today = new Date();

        //Valida datas
        if (initialDate < today || initialDate < endDate) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Datas não válidas',
                'partners',
                '/create'
            );
            return;
        }

        try {
            //Verifica existência de parceiro com mesmo title em lowercase
            const formattedTitle = title.toLowerCase();
            const doesPartnerAlreadyExist = await Partner.findOne({ formattedTitle });

            if (doesPartnerAlreadyExist) {
                _messages.conflict(res, req, null, 'Já existe uma parceria com este nome');
                return;
            }

            const logo = req.files?.logo;

            if (logo) {
                let pathAzure = await azureBlob(logo, 'showcase/partners', false, 'lmsassetsanon');
                body.logo = pathAzure.replace(AZURE_BLOB_URL, DOMAIN);
            }

            // let dto = body.keys?.map((x) => {
            //     // Gerando um valor hexadecimal de 12 caracteres
            //     let bytes = crypto.randomBytes(Math.ceil(12 / 2));
            //     let hex = bytes.toString('hex').toUpperCase();
            //     const key = hex.slice(0, 12);
            //     return { ...x, key: key };
            // });
            // body.keys = dto;

            if (req?.segmentation) {
                // await handleSegmentationOnCreate()
            }

            const partner = await Partner.create(body);
            _messages.success(
                res,
                req,
                partner,
                'Criação de dados',
                'partners',
                'create',
                partner,
                [],
                true,
                'CREATE'
            );
        } catch (error) {
            console.error(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'partners',
                '/create'
            );
        }
    },

    async update(req, res) {
        const { id: _id } = req.params;
        const body = JSON.parse(req.fields.payload) ?? null;

        try {
            //Valida se o id recebido existe
            const doesPartnerExist = await Partner.findById(_id);
            if (!doesPartnerExist) {
                _messages.notFound(res, req, null, 'Este partner não existe');
                return;
            }
            const logo = req.files?.logo;

            if (logo) {
                let pathAzure = await azureBlob(logo, 'showcase/partners', false, 'lmsassetsanon');
                body.logo = pathAzure.replace(AZURE_BLOB_URL, DOMAIN);
            }

            const partner = await Partner.findByIdAndUpdate(_id, body);
            _messages.success(
                res,
                req,
                partner,
                'Criação de dados',
                'partners',
                'create',
                partner,
                [],
                true,
                'UPDATE'
            );
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'partners',
                '/update'
            );
        }
    },

    async delete(req, res) {
        const { id: _id } = req.params;
        try {
            //Valida se o id recebido existe
            const doesPartnerExist = await Partner.findById(_id);
            if (!doesPartnerExist) {
                _messages.notFound(res, req, null, 'Este partner não existe');
                return;
            }

            await Partner.findByIdAndDelete(_id);
            _messages.success(res, req, 'Deletado com sucesso!');
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'partners',
                '/delete'
            );
        }
    },

    async getPartnersByToken(req, res) {
        const today = moment();
        const { token } = req.query;
        try {
            if (!token) {
                _messages.badRequest(
                    res,
                    req,
                    'Token inexistente',
                    'Token inexistente',
                    'partners',
                    'getPartnersByToken'
                );
                return;
            }
            
            const partner = await Partner
                .findOne({ active: true, 'keys.key': token })
                .populate('keys.form');

            if (!partner) {
                _messages.unauthorized(
                    res,
                    req,
                    new Error('Este token não está atrelado a nenhum parceiro'),
                    'Este token não está atrelado a nenhum parceiro',
                    'partners',
                    'getPartnersByToken'
                );
                return;
            }
            const selectedKey = partner.keys.find((key) => key.key === token);

            if (selectedKey.endDate < today || selectedKey.initialDate > today) {
                _messages.unauthorized(
                    res,
                    req,
                    new Error('DataInvalida'),
                    'O token do parceiro está expirado.',
                    'users',
                    'signup'
                );
                return;
            }

            if (partner?.keys?.some(key => !key.form)) {
                const defaultForm = await getDefaultForm();

                partner.keys = partner.keys.map(key => {
                    if (!key.form) {
                        key.form = defaultForm;
                    }

                    return key;
                });
            }

            _messages.success(res, req, partner);
        } catch (error) {
            console.error(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'partners',
                '/delete'
            );
        }
    },
};
