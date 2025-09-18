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
            
            await _functions.recordLog(
                req,
                'AUTOMATION_ERROR',
                `Erro ao listar automações: ${error.message}`,
                'messages/automations',
                'listMessageAutomations',
                null,
                { error: error.message }
            );

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
            
            await _functions.recordLog(
                req,
                'AUTOMATION_CREATE',
                `Automação criada com sucesso: ${automation.name}`,
                'messages/automations',
                'createMessageAutomation',
                automation,
                null,
                null,
                true,
                'CREATE'
            );

            _messages.success(res, req, 'Automação criada com sucesso');
        } catch (error) {
            console.log(error);
            
            await _functions.recordLog(
                req,
                'AUTOMATION_ERROR',
                `Erro ao criar automação: ${error.message}`,
                'messages/automations',
                'createMessageAutomation',
                null,
                req.body,
                null
            );

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

            const currentAutomation = await require('./business').getMessageAutomationById(id);
            
            const messageAutomation = await updateMessageAutomation(
                id,
                req.body
            );

            await _functions.recordLog(
                req,
                'AUTOMATION_UPDATE',
                `Automação atualizada com sucesso: ${messageAutomation.name || id}`,
                'messages/automations',
                'updateMessageAutomation',
                req.body,
                currentAutomation,
                null,
                true,
                'UPDATE'
            );

            _messages.success(res, req, 'Atualizada com sucesso!');
        } catch (error) {
            console.log(error);
            
            await _functions.recordLog(
                req,
                'AUTOMATION_ERROR',
                `Erro ao atualizar automação ${req.params.id}: ${error.message}`,
                'messages/automations',
                'updateMessageAutomation',
                null,
                { automationId: req.params.id, requestBody: req.body, error: error.message }
            );

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

            const currentAutomation = await require('./business').getMessageAutomationById(messageAutomationId);
            const previousStatus = currentAutomation?.isActive;
            
            const newActiveStatus = await toggleActive(messageAutomationId);

            await _functions.recordLog(
                req,
                'AUTOMATION_UPDATE',
                `Status da automação alterado: ${currentAutomation?.name || messageAutomationId} - ${previousStatus ? 'ATIVO' : 'INATIVO'} → ${newActiveStatus ? 'ATIVO' : 'INATIVO'}`,
                'messages/automations',
                'toggleActive',
                { isActive: newActiveStatus, automationId: messageAutomationId },
                { isActive: previousStatus, automationId: messageAutomationId },
                null,
                true,
                'AUTOMATION_UPDATE'
            );

            _messages.success(res, req, newActiveStatus);
        } catch (error) {
            console.log(error);
            
            await _functions.recordLog(
                req,
                'AUTOMATION_ERROR',
                `Erro ao alterar status da automação ${req.params.messageAutomationId}: ${error.message}`,
                'messages/automations',
                'toggleActive',
                null,
                { automationId: req.params.messageAutomationId, error: error.message }
            );

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
