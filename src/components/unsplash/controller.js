require("dotenv").config();
const _messages = require("../../utils/messages");
const { pagination, ordernation } = require('../../utils/functions')
const axios = require('axios');
const { UNSPLASH_API_KEY } = process.env
module.exports = {
    async search (req, res) {
        try {
            const { searchBy, order, orientation, page, per_page } = req.query

            const response = await axios.get('https://api.unsplash.com/search/photos', {
                params: {
                    query: searchBy,
                    order_by: order,
                    page,
                    per_page,
                    orientation,
                    client_id: UNSPLASH_API_KEY,
                },
            });

            return _messages.success(res, req, response.data);

        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno do servidor",
                "unsplash",
                "search"
            );
        }

    },

    async dispatchDownload (req, res) {
        try {
            const { url } = req.body
            const { data } = await axios.get(url, { params: { client_id: UNSPLASH_API_KEY, } });

            return _messages.success(res, req, data.url);

        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno do servidor",
                "unsplash",
                "dispatchDownload"
            );
        }
    }
}
