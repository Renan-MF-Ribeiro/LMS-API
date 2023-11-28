const { COMPOSE_PROJECT_NAME, CLIENT_ID, AZURE_BLOB_URL, NODE_ENV } = process.env;
const _messages = require('../../utils/messages');
const zendesk = require('node-zendesk');

module.exports = {
    async create (req, res) {
        try {
            const client = zendesk.createClient({
                username: 'diego@happmobi.com.br',
                token: '6amofnCVfXX0MpCuIjOxhdvdmZ6MY86QYlWFif2i',
                subdomain: 'happlearning'
            });
            req.body.ticket.custom_fields.push({
                id: 9475144442263,
                value: COMPOSE_PROJECT_NAME

            })
            req.body.ticket.custom_fields.push({
                id: 19253343340439,
                value: CLIENT_ID,
            },)
            client.tickets.create(req.body).then(response => {

                _messages.success(
                    res,
                    req,
                    response.result,
                    'Sucesso',
                    'zendesk',
                    'createTicket'
                );
            }).catch(error => {
                console.error(`Failed to get list of users: ${error.message}`);
                _messages.internalServer(
                    res,
                    req,
                    error.message,
                    'Erro interno no servidor',
                    'zendesk',
                    'createTicket'
                );
            });



        }
        catch {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'zendesk',
                'createTicket'
            );
        }
    }
}
