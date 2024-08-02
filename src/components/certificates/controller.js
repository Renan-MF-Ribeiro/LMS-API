const formData = require('form-data');
const fs = require('fs')

const _messages = require('../../utils/messages');
const { Trail } = require('../trails/model');
const { certificateClient } = require('./business');

const getHeaders = (req) => ({
    Authorization: `Bearer ${req.headers.authorization}`
});

const prepareFormData = (req) => {
    const form = new formData();

    Object.keys(req.fields).forEach(key => {
        form.append(key, req.fields[key]);
    });

    form.append("file", fs.createReadStream(req.files.file.path));

    return form;
}

module.exports = {
    async getCertificates(req, res) {
        try {
            const clientId = req.params.clientId;

            const { data } = await certificateClient.get(
                `/certificates/findall/${clientId}`,
                { headers: getHeaders(req), params: req.query }
            );

            _messages.success(res, req, data, 'ok', 'certifier', 'getCertificates');
        } catch (error) {
            _messages.badRequest(res, req, 'Operação inválida', error.message, 'certifier', 'getCertificates');
        }
    },
    async getCertificate(req, res) {
        try {
            const { data } = await certificateClient.get(
                '/certificates/find',
                { headers: getHeaders(req), params: req.query }
            );

            _messages.success(res, req, data, 'ok', 'certifier', 'getCertificate');
        } catch (error) {
            _messages.badRequest(res, req, 'Operação inválida', error.message, 'certifier', 'getCertificate');
        }
    },
    async getCertificateOpen(req, res) {
        try {
            const { data } = await certificateClient.get(
                '/certificates/find-open',
                { headers: getHeaders(req), params: req.query }
            );

            _messages.success(res, req, data, 'ok', 'certifier', 'getCertificateOpen');
        } catch (error) {
            _messages.badRequest(res, req, 'Operação inválida', error.message, 'certifier', 'getCertificateOpen');
        }
    },
    async downloadCertificate(req, res) {
        try {
            const { data } = await certificateClient.get(
                `/certificates/file`,
                { headers: getHeaders(req), params: req.query, responseType: 'arraybuffer' }
            );

            const file = Buffer.from(data, 'binary');

            res.setHeader('Content-Type', 'application/pdf');
            res.send(file);
        } catch (error) {
            _messages.badRequest(res, req, 'Operação inválida', error.message, 'certifier', 'downloadCertificate');
        }
    },
    async previewCertificate(req, res) {
        try {
            const { data } = await certificateClient.get(
                `/certificates/preview`,
                { headers: getHeaders(req), params: req.query, responseType: 'arraybuffer' }
            );

            const file = Buffer.from(data, 'binary');

            res.setHeader('Content-Type', 'application/pdf');
            res.send(file);
        } catch (error) {
            _messages.badRequest(res, req, 'Operação inválida', error.message, 'certifier', 'previewCertificate');
        }
    },
    async createCertificate(req, res) {
        try {
            const { userName, trailName, itemName } = req.body;

            const { data } = await certificateClient.post(
                '/certificates',
                req.body,
                { headers: getHeaders(req), responseType: 'arraybuffer' }
            );

            const file = Buffer.from(data, 'binary');

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="certificado-${userName}-${trailName || itemName}.pdf"`);
            res.send(file);
        } catch (error) {
            _messages.badRequest(res, req, 'Operação inválida', error.message, 'certifier', 'createCertificate');
        }
    },
    async deleteCertificate(req, res) {
        try {
            const certificateId = req.params.id;

            const { data } = await certificateClient.delete(
                `/certificates/delete/${certificateId}`,
                { headers: getHeaders(req) }
            );

            _messages.success(res, req, data, 'ok', 'certifier', 'deleteCertificate');
        } catch (error) {
            _messages.badRequest(res, req, 'Operação inválida', error.message, 'certifier', 'deleteCertificate');
        }
    },
    async updateLayout(req, res) {
        try {
            const form = prepareFormData(req);

            const { data } = await certificateClient.post(
                '/layouts/update',
                form,
                { headers: { ...getHeaders(req), ...form.getHeaders() } }
            );

            _messages.success(res, req, data, 'ok', 'certifier', 'updateLayout');
        } catch (error) {
            _messages.badRequest(res, req, 'Operação inválida', error.message, 'certifier', 'updateLayout');
        }
    },
    async createLayout(req, res) {
        try {
            const form = prepareFormData(req);

            const { data } = await certificateClient.post(
                '/layouts/create',
                form,
                { headers: { ...getHeaders(req), ...form.getHeaders() } }
            );

            _messages.success(res, req, data, 'ok', 'certifier', 'createLayout');
        } catch (error) {
            _messages.badRequest(res, req, 'Operação inválida', error.message, 'certifier', 'createLayout');
        }
    },
    async getLayout(req, res) {
        try {
            const layoutId = req.params.id;

            const { data } = await certificateClient.get(
                `/layouts/find-one/${layoutId}`,
                { headers: getHeaders(req) }
            );

            _messages.success(res, req, data, 'ok', 'certifier', 'getLayout');
        } catch (error) {
            _messages.badRequest(res, req, 'Operação inválida', error.message, 'certifier', 'getLayout');
        }
    },
    async getLayouts(req, res) {
        try {
            const clientId = req.params.clientId;

            const { data } = await certificateClient.get(
                `/layouts/${clientId}`,
                { headers: getHeaders(req) }
            );

            _messages.success(res, req, data, 'ok', 'certifier', 'getLayouts');
        } catch (error) {
            _messages.badRequest(res, req, 'Operação inválida', error.message, 'certifier', 'getLayouts');
        }
    },
    async deleteLayout(req, res) {
        try {
            const layoutId = req.params.id;

            const { data: dataTrails } = await certificateClient.get(
                `/certificates/trails-by-layout/${layoutId}`,
                { headers: getHeaders(req) }
            );

            if (dataTrails.length > 0) {
                const trails = await Trail
                    .find({
                        _id: { $in: dataTrails },
                        enabled: true,
                    })
                    .sort({ createdAt: -1 })
                    .limit(4)
                    .select('_id title');

                if (trails.length > 0) {
                    const errorData = {
                        message: 'Existem trilhas ativas com este modelo de certificado',
                        trails,
                    };

                    return _messages.badRequest(res, req, 'Operação inválida', errorData, 'certifier', 'deleteLayout');
                }
            }

            const { data } = await certificateClient.delete(
                `/layouts/${layoutId}`,
                { headers: getHeaders(req) }
            );

            _messages.success(res, req, data, 'ok', 'certifier', 'deleteLayout');
        } catch (error) {
            _messages.badRequest(res, req, 'Operação inválida', error.message, 'certifier', 'deleteLayout');
        }
    },
};

