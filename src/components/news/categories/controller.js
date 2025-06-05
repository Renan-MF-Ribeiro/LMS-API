require("dotenv").config();
const _messages = require("../../../utils/messages");
const { newsApi } = require('../http-adapter');
const { AzureBlob } = require('../../../utils/files');

module.exports = {
    async create(req, res) {
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
};