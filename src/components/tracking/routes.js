const express = require("express");
const _controller = require("./controller");
const formidable = require("express-formidable");
const shelljs = require("shelljs");
const { UPLOADS_PATH } = process.env;

const { isAdmin } = require("../../utils/middlewares");

const events = [
    {
        event: "error",
        action: function (req, res, err) {
            return res.status(413).json({
                name: "TOO LARGE",
                message: "O tamanho máximo para upload de arquivos é 1GB",
            });
        },
    },
];
try {
    shelljs.mkdir("-p", UPLOADS_PATH);
} catch { }
module.exports = express.Router()
    .put('/', _controller.createOrUpdate)
    .get('/', _controller.list)
    .delete('/', isAdmin, _controller.deleteQuery)

    .get('/start', _controller.findOrCreate)

    .put('/doc', _controller.createOrUpdateDocument)
    .put('/media', _controller.createOrUpdateMedia)
    .put('/scorm', _controller.createOrUpdateSCORM)
    .get("/activity-items-correction", _controller.listActivitiesForCorrection)
    .get("/activity-items-historic", _controller.listActivitiesHistoric)
    .put("/update-activity-admin", _controller.updateActivityAdmin)
    .put(
        "/update-activity-user",
        formidable({ maxFileSize: 1024 * 1024 * 1024 }, events),
        _controller.updateActivityUser
    )
    .put("/registerViewPost", _controller.registerViewPost)
