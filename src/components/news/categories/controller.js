require("dotenv").config();
const _messages = require("../../../utils/messages");
const { newsApi } = require('../http-adapter');
const { azureBlob } = require('../../../utils/files');

module.exports = {

    async list(req, res) {
        try {
            _messages.success(res, req);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno do servidor",
                "trails",
                "createPadlet"
            );
        }
    },

    async create(req, res) {
            const { title, news, enabled } = req.fields
            const { thumb } = req.files;

            let thumbPath;

            if (thumb) {
              thumbPath = await azureBlob(thumb, 'news/banners');
            }

            const body = { title, news: JSON.parse(news), enabled: enabled === 'true' ? true : false, thumbPath }
            
            try {
              const { data } = await newsApi.post(`/categories/create`, body);
              return _messages.success(res, req, data, 'ok', 'news', 'category created successfully');
            }  catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno do servidor",
                "trails",
                "createPadlet"
            );
        }
    },
};