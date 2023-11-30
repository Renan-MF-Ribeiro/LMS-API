const { COMPOSE_PROJECT_NAME, CLIENT_ID, AZURE_BLOB_URL, NODE_ENV } = process.env;
const _messages = require('../../utils/messages');
const zendesk = require('node-zendesk');
const fs = require('fs');
const { getTokenAttachment } = require('./business')



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
                id: 9475144442263,
                value: COMPOSE_PROJECT_NAME

            })

            body.ticket.custom_fields.push({
                id: 19253343340439,
                value: CLIENT_ID,
            })
            const client = zendesk.createClient({
                username: 'diego@happmobi.com.br',
                token: '6amofnCVfXX0MpCuIjOxhdvdmZ6MY86QYlWFif2i',
                subdomain: 'happlearning'
            });

            console.log(body)
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
