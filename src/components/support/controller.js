const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const { getUserByToken } = require('../../utils/functions');
const { User } = require('../users/model');

const _messages = require('../../utils/messages');

module.exports = {
    async create(req, res) {
        try {
            const reqPayload = JSON.parse(req.fields.payload);
            const form = new FormData();
            const payload = {
                ticket: {
                    ...reqPayload.ticket,
                },
                clientName: process.env.COMPOSE_PROJECT_NAME,
            };

            let user = null;

            if (payload.ticket?.custom_fields?.[1]?.value) {
                user = req.headers.authorization ? await getUserByToken(req) : await User.findOne({ networkLogin: payload.ticket.custom_fields[1].value })
            }

            payload.ticket.requester._id = user?._id || payload.ticket?.requester?.email;
            const strPayload = JSON.stringify(payload);
            form.append('payload', strPayload);
            if (Object.entries(req.files).length > 0) {
                for (const [_fileKey, file] of Object.entries(req.files)) {
                    const fieldName = file.name.split('.')[0];
                    const readStream = fs.createReadStream(file.path);
                    form.append(fieldName, readStream);
                }
            }

            const url = `${process.env.API_ZENDESK}/support/ticket/${process.env.CLIENT_ID}`;

            const headers = {
                ...form.getHeaders(),
                Authorization: process.env.API_KEY_ZENDESK,
            };

            try {
                const response = await axios({
                    method: 'post',
                    url,
                    headers,
                    data: form,
                });
                return _messages.success(
                    res,
                    req,
                    response.data,
                    'Sucesso',
                    'support',
                    'createTicket'
                );
            } catch (err) {
                console.error(
                    `Failed in zendesk microsservice: ${err.message}`
                );
                return _messages.internalServer(
                    res,
                    req,
                    err.message,
                    'Erro interno no servidor (happlearning-zendesk)',
                    'support',
                    'createTicket'
                );
            }
        } catch (error) {
            console.error(`Failed to process ticket data: ${error.message}`);

            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'support',
                'createTicket'
            );
        }
    },

    async getZendeskTickets(req, res) {
        try {
            const { query } = req;
            const user = await getUserByToken(req)
            const url = `${process.env.API_ZENDESK}/support/tickets/${process.env.CLIENT_ID}/${user._id}`;

            const headers = {
                Authorization: process.env.API_KEY_ZENDESK,
            };

            try {
                const response = await axios({
                    method: 'get',
                    url,
                    headers,
                    params: query,
                });
                return _messages.success(
                    res,
                    req,
                    response.data,
                    'Sucesso',
                    'support',
                    'getZendeskTickets'
                );
            } catch (err) {
                console.error(
                    `Failed in zendesk microsservice: ${err.message}`
                );
                return _messages.internalServer(
                    res,
                    req,
                    err.message,
                    'Erro interno no servidor (happlearning-zendesk)',
                    'support',
                    'getZendeskTickets'
                );
            }
        } catch (error) {
            console.error(`Failed to process ticket data: ${error.message}`);

            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'support',
                'getZendeskTickets'
            );
        }
    },

    async createComment(req, res) {
        try {
            const form = new FormData();

            const reqPayload = JSON.parse(req.fields.payload);
            const payload = {
                body: reqPayload.body,
                id: reqPayload.id
            };
            const strPayload = JSON.stringify(payload);
            form.append('payload', strPayload);

            if (Object.entries(req.files).length > 0) {
                for (const [_fileKey, file] of Object.entries(req.files)) {
                    const fieldName = file.name.split('.')[0];
                    const readStream = fs.createReadStream(file.path);
                    form.append(fieldName, readStream);
                }
            }

            const url = `${process.env.API_ZENDESK}/support/comment/${process.env.CLIENT_ID}`;

            const headers = {
                ...form.getHeaders(),
                Authorization: process.env.API_KEY_ZENDESK,
            };

            try {
                const response = await axios({
                    method: 'post',
                    url,
                    headers,
                    data: form,
                });
                return _messages.success(
                    res,
                    req,
                    response.data,
                    'Sucesso',
                    'support',
                    'createComment'
                );
            } catch (err) {
                console.error(
                    `Failed in zendesk microsservice: ${err.message}`
                );
                return _messages.internalServer(
                    res,
                    req,
                    err.message,
                    'Erro interno no servidor (happlearning-zendesk)',
                    'support',
                    'createComment'
                );
            }
        } catch (error) {
            console.error(`Failed to process ticket data: ${error.message}`);

            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'support',
                'createComment'
            );
        }
    },
};
