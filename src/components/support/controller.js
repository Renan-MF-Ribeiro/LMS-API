const { COMPOSE_PROJECT_NAME, CLIENT_ID, ZENDESK_USER, ZENDESK_API_KEY, ZENDESK_SUBDOMAIN } = process.env;
const _messages = require('../../utils/messages');
const zendesk = require('node-zendesk');
const fs = require('fs');
const { getTokenAttachment, custom_fields } = require('./business')



module.exports = {
    async create (req, res) {
        try {
            const body = JSON.parse(req.fields.payload);

            if (Object.keys(req.files).length !== 0) {
                let fileArray = Object.keys(req.files).map((key) => req.files[key]);

                const tokenFile = await getTokenAttachment(fileArray)

                body.ticket.comment.uploads = [tokenFile]

            }

            body.ticket.custom_fields.push({
                id: custom_fields.ClientName,
                value: COMPOSE_PROJECT_NAME

            })

            body.ticket.custom_fields.push({
                id: custom_fields.ClientID,
                value: CLIENT_ID,
            })
            const client = zendesk.createClient({
                username: ZENDESK_USER,
                token: ZENDESK_API_KEY,
                subdomain: ZENDESK_SUBDOMAIN
            });

            client.tickets.create(body).then(response => {
                return _messages.success(
                    res,
                    req,
                    response.result,
                    'Sucesso',
                    'support',
                    'createTicket'
                );
            }).catch(error => {
                console.error(`Failed to create ticket: ${error.message}`);
                return _messages.internalServer(
                    res,
                    req,
                    error.message,
                    'Erro interno no servidor',
                    'support',
                    'createTicket'
                );
            });


        }
        catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'support',
                'createTicket'
            );
        }
    }
}
