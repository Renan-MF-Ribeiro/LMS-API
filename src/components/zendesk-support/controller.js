const _messages = require('../../utils/messages');
const zendesk = require('node-zendesk');

module.exports = {
    async create (req, res) {
        try {
            var client = zendesk.createClient({
                username: 'diego@happmobi.com.br',
                token: '6amofnCVfXX0MpCuIjOxhdvdmZ6MY86QYlWFif2i',
                subdomain: 'happlearning'
            });

            client.tickets.create(req.body).then(response => {
                console.log(response)
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
