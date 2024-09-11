const _messages = require('../../utils/messages');
const { azureBlob } = require('../../utils/files');
const crypto = require('crypto');
const { Partner } = require('./model');

module.exports = {
    async getParterners(req, res) {
        try {
            const partners = await Partner.find();
            const total = await Partner.find().countDocuments();

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
                'getParterners'
            );
        }
    },
    async getActivePartners(req, res) {
        try {
            const partners = await Partner.find({ active: true });
            const total = await Partner.find().countDocuments();

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

            let dto = body.keys?.map((x) => {
                // Gerando um valor hexadecimal de 12 caracteres
                let bytes = crypto.randomBytes(Math.ceil(12 / 2));
                let hex = bytes.toString('hex').toUpperCase();
                const key = hex.slice(0, 12);
                return { ...x, key: key };
            });
            body.keys = dto
            
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
