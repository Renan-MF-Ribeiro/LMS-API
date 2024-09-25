const axios = require('axios');
const _messages = require('../../utils/messages');
const { pagination, ordernation, getUserByToken } = require('../../utils/functions');
const { handleError } = require('../../utils/errors');


const host = process.env.API_ALURA;
const clientId = process.env.CLIENT_ID;
const headers = { 'x-client-key': process.env.API_KEY_ALURA };

const AluraController = {
    async getClient (req, res) {
        try {
            const uri = `${host}/clients/${clientId}`;
            const { data } = await axios.get(uri, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error)
        }
    },

    async addResources (req, res) {
        try {
            const { resources } = req.body
            const { email } = await getUserByToken(req)
            const uri = `${host}/clients/${clientId}/${email}`;
            const { data } = await axios.patch(uri, { resources }, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error)
        }
    },

    async checkResources (req, res) {
        try {
            const { resources } = req.body
            const { email } = await getUserByToken(req)
            const uri = `${host}/clients/check-resources/${clientId}/${email}`;
            const { data } = await axios.post(uri, { resources }, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error)
        }
    },

    async getSections (req, res) {
        try {
            const uri = `${host}/courses/sections/${clientId}`;
            const { data } = await axios.get(uri, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error)
        }
    },

    async listByTrails (req, res) {
        try {
            const { email } = await getUserByToken(req)
            const uri = `${host}/courses/trails/${clientId}/${email}`;
            const { data } = await axios.get(uri, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error)
        }
    },

    async getByTrails (req, res) {
        try {
            const { email } = await getUserByToken(req)
            const { trailId } = req.params;
            const uri = `${host}/courses/trails/${clientId}/${email}/${trailId}`;
            const { data } = await axios.get(uri, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error)
        }
    },

    async launch (req, res) {
        try {
            const { itemId } = req.params
            const { email } = await getUserByToken(req)
            const uri = `${host}/courses/launch/${clientId}/${email}/${itemId}`
            const { data: launchUrl } = await axios.get(uri, { headers })

            return _messages.success(res, req, launchUrl);
        } catch (error) {
            return handleError(res, req, error)
        }
    },

    async search (req, res) {
        try {
            const { searchBy } = req.query
            const { email } = await getUserByToken(req)
            const uri = `${host}/courses/search/${clientId}?email=${email}&searchBy=${encodeURI(searchBy)}`
            const { data } = await axios.get(uri, { headers })

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error)
        }
    }

    ,

    async listAllItems (req, res) {
        try {
            const { skip, limit } = pagination(req);
            const { sort, order } = ordernation(req);
            const { searchBy } = req.query;

            const queryParams = new URLSearchParams({
                page: skip,
                limit,
                sortBy: sort,
                order,
                search: searchBy
            });

            const uri = `${host}/courses/items/${clientId}?${queryParams}`;
            const { data } = await axios.get(uri, { headers });

            return _messages.success(res, req, data);
        } catch (error) {
            return handleError(res, req, error);
        }
    }
};

module.exports = AluraController;
