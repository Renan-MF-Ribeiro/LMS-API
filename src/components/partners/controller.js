const crypto = require('crypto');
const { DOMAIN, AZURE_BLOB_URL } = process.env;
const moment = require('moment');
const _messages = require('../../utils/messages');
const { azureBlob } = require('../../utils/files');
const { Partner } = require('./model');
const { pagination, ordernation } = require('../../utils/functions');

module.exports = {
    async getPartners(req, res) {
        const { skip, limit } = pagination(req);
        const { order, sort } = ordernation(req);
        const searchBy = req.query.searchBy;

        const query = searchBy
            ? {
                  $or: [{ title: { $regex: searchBy, $options: 'i' } }],
              }
            : {};

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

            let dto = body.keys?.map((x) => {
                // Gerando um valor hexadecimal de 12 caracteres
                let bytes = crypto.randomBytes(Math.ceil(12 / 2));
                let hex = bytes.toString('hex').toUpperCase();
                const key = hex.slice(0, 12);
                return { ...x, key: key };
            });
            body.keys = dto;

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
        try {
            const { token } = req.params;
            const partner = await Partner.findOne({ active: true, 'keys.key': token });

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
