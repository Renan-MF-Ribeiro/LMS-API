const { default: axios } = require('axios');
const _messages = require('../../utils/messages');
const { Trail } = require('../trails/model');

const { API_CERTIFICATES } = process.env;

const getHeaders = (req) => ({
    Authorization: `Bearer ${req.headers.authorization}`
});

module.exports = {
    // async getCertificates(req, res) { _messages.success(res, req, { fn: "getCertificates" }) },
    // async getCertificate(req, res) { _messages.success(res, req, { fn: "getCertificate" }) },
    // async getCertificateOpen(req, res) { _messages.success(res, req, { fn: "getCertificateOpen" }) },
    // async downloadCertificate(req, res) { _messages.success(res, req, { fn: "downloadCertificate" }) },
    // async previewCertificate(req, res) { _messages.success(res, req, { fn: "previewCertificate" }) },
    // async createCertificate(req, res) { _messages.success(res, req, { fn: "createCertificate" }) },
    // async deleteCertificate(req, res) { _messages.success(res, req, { fn: "deleteCertificate" }) },
    // async updateLayout(req, res) { _messages.success(res, req, { fn: "updateLayout" }) },
    // async createLayout(req, res) { _messages.success(res, req, { fn: "createLayout" }) },
    // async getLayout(req, res) { _messages.success(res, req, { fn: "getLayout" }) },
    // async getLayouts(req, res) { _messages.success(res, req, { fn: "getLayouts" }) },
    async deleteLayout(req, res) {
        try {
            const layoutId = req.params.id;

            const { data: dataTrails } = await axios.get(
                `${API_CERTIFICATES}/certificates/trails-by-layout/${layoutId}`,
                { headers: getHeaders(req) }
            );

            if (dataTrails.length > 0) {
                const trails = await Trail
                    .find({
                        _id: { $in: dataTrails },
                        enabled: true,
                    })
                    .sort({ createdAt: -1 })
                    .limit(3)
                    .select('_id title');

                if (trails.length > 0) {
                    const errorData = {
                        message: 'Existem trilhas ativas com este modelo de certificado',
                        trails,
                    };

                    return _messages.badRequest(res, req, 'Operação inválida', errorData, 'certifier', 'deleteLayout');
                }
            }

            const { data } = await axios.delete(
                `${API_CERTIFICATES}/layouts/${layoutId}`,
                { headers: getHeaders(req) }
            );

            _messages.success(res, req, data, 'ok', 'certifier', 'deleteLayout');
        } catch (error) {
            _messages.badRequest(res, req, 'Operação inválida', error.message, 'certifier', 'deleteLayout');
        }
    },
};

