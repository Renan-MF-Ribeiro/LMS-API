require("dotenv").config();
const _messages = require("../../utils/messages");
const { pagination, ordernation } = require('../../utils/functions')
const axios = require('axios');

module.exports = {
    async search (req, res) {
        try {
            console.log(req.query)
            const { searchBy, order, orientation, page, per_page } = req.query

            const response = await axios.get('https://api.unsplash.com/search/photos', {
                params: {
                    query: searchBy,
                    order_by: order,
                    page,
                    per_page,
                    orientation,
                    client_id: 'taM3ogQob0HPhithCiFKt_Ou0uzFMXRDRNfoelnYK2s',
                },
            });

            return _messages.success(res, req, response.data);

        } catch (error) {
            return _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno do servidor",
                "trails",
                "createPadlet"
            );
        }

    }
}
