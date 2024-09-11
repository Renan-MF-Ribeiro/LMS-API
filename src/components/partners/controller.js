const _messages = require('../../utils/messages');
const { azureBlob } = require('../../utils/files');
const { getTagsElegiblesByToken, checkEligibilityTagsAnd } = require('../sections/business');
const { Partner } = require('./model');

module.exports = {
    async getParterners(req, res) {
        const { id } = req.params;
        try {
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
        const tags = await getTagsElegiblesByToken(req);

        try {
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
                'get'
            );
        }
    },

    async create(req, res) {
        const partner = req.body;
        let logoPath;

        try {
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
        try {
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
    //TODO - verificar delete lógico ou físico
    async delete(req, res) {
        try {
            const partner = req.body;

            const { id, active: isActive } = partner;
            await Partner.findByIdAndUpdate(id, { active: isActive });

            _messages.success(res, req, 'Desativado com sucesso!');
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
