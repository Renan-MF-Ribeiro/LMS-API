const _messages = require('../../utils/messages');
const { azureBlob } = require('../../utils/files');
const crypto = require('crypto');
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
    async getTokenInfo(req, res) {
        const { token: key } = req.params;

        try {
            const partner = await Partner.findOne({ 'keys.key': key }, 'logo description title');

            _messages.success(res, req, {
                data: partner
            });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'partners',
                'getTokenInfo'
            );
        }
    },
    async getActivePartners(req, res) {
        const { skip, limit } = pagination(req);
        const { order, sort } = ordernation(req);
        const searchBy = req.query.searchBy;

        const query = searchBy
            ? {
                  $and: [
                      { $or: [{ title: { $regex: searchBy, $options: 'i' } }] },
                      { active: true },
                  ],
              }
            : { active: true };

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
                'getActivePartners'
            );
        }
    },

    async create(req, res) {
        const { body } = req;
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
            let logoPath;

            if (doesPartnerAlreadyExist) {
                _messages.conflict(res, req, null, 'Já existe uma parceria com este nome');
                return;
            }

            if (logo) {
                logoPath = await azureBlob(logo, 'partners/logos');
                logoPath = logoPath.replace(AZURE_BLOB_URL, DOMAIN);
                body.logo = logoPath;
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
        const { body } = req;
        try {
            //Valida se o id recebido existe
            const doesPartnerExist = await Partner.findById(_id);
            if (!doesPartnerExist) {
                _messages.notFound(res, req, null, 'Este partner não existe');
                return;
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
};
