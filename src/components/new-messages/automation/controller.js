const {
    createMessageAutomation,
    listMessageAutomations,
    updateMessageAutomation,
    toggleActive,
} = require('./business');
const _messages = require('../../../utils/messages');
const _functions = require('../../../utils/functions');

module.exports = {
    async listMessageAutomations(req, res) {
        try {
            const { skip, limit } = _functions.pagination(req);
            const { order, sort } = _functions.ordernation(req);
            const searchBy = req.query.searchBy;

            const { data, total } = await listMessageAutomations({
                skip,
                limit,
                order,
                sort,
                searchBy,
            });

            _messages.success(res, req, { data, total });
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'messages/automations',
                'get'
            );
        }
    },

    async createMessageAutomation(req, res) {
        try {
            const automation = await createMessageAutomation(req.body);
            _messages.success(res, req, 'Automação criada com sucesso');
        } catch (error) {
            console.log(error);
            if (error.message.includes('semana'))
                return _messages.badRequest(
                    res,
                    req,
                    error.message,
                    error.message,
                    'messages/automations',
                    'post'
                );
            _messages.internalServer(
                res,
                req,
                error.message,
                error.message,
                'messages/automations',
                'post'
            );
        }
    },

    async updateMessageAutomation(req, res) {
        try {
            const { id } = req.params;

            const messageAutomation = await updateMessageAutomation(
                id,
                req.body
            );

            _messages.success(res, req, 'Atualizada com sucesso!');
        } catch (error) {
            console.log(error);
            if (error.message.includes('semana'))
                return _messages.badRequest(
                    res,
                    req,
                    error.message,
                    error.message,
                    'messages/automations',
                    'post'
                );
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'messages/automations',
                'put'
            );
        }
    },

    async toggleActive(req, res) {
        try {
            const { messageAutomationId } = req.params;

            const newActiveStatus = await toggleActive(messageAutomationId);

            _messages.success(res, req, newActiveStatus);
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'messages/automations',
                'toggleActive'
            );
        }
    },
};
