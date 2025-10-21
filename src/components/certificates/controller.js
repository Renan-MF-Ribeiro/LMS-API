const { stripHtmlTags, getUserByToken, processTrailTracking, processTrailTrackingV2 } = require('../../utils/functions');
const _messages = require('../../utils/messages');
const { Trail } = require('../trails/model');
const { User } = require('../users/model');
const {
    certificateClient,
    getHeaders,
    prepareFormData,
    getInitialDate,
    getCertificateFileName,
    formatCourseLoad
} = require('./business');
const moment = require('moment');
const { Item } = require('../items/model');
const { UsersWithProcessedTags } = require('../courses/model');
const { Tracking } = require('../tracking/model');
const { populateTrails } = require('../trails/business');
const { populateTrailFields } = require('../feed/business');

module.exports = {
    async getCertificates(req, res) {
        try {
            const { data } = await certificateClient.get(
                `/certificates/findall/${process.env.CLIENT_ID}`,
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
            // console.log(req)
            const { data } = await certificateClient.get(
                '/certificates/find-open',
                { params: req.query }
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
                {
                    headers: getHeaders(req),
                    params: { ...req.query, clientId: process.env.CLIENT_ID },
                    responseType: 'arraybuffer'
                }
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

    async createCertificateTrail(req, res) {

        const getCourseLoad = (courseLoad) => {
            const dur = moment.duration(courseLoad, 'minutes');
            const durHours = Math.floor(dur.asHours());
            const durMins = Math.floor(dur.asMinutes()) - durHours * 60;

            return durHours.toString().padStart(2, '0') + ':' + durMins.toString().padStart(2, '0');
        };

        const getItems = async (trail) => {

            const items = await Item.find({
                '_id': {
                    $in: trail?.items.map((item) => item.itemID)
                }
            });

            // console.log('items', items);

            return items?.map((item) => {
                const dur = moment.duration(item.durationHours, 'minutes');
                const durHours = Math.floor(dur.asHours());
                const durMins = Math.floor(dur.asMinutes()) - durHours * 60;
                const time =
                    durMins > 0 ? `${durMins.toString().padStart(2, '0')}min` : '';
                const timeString =
                    durHours > 0
                        ? `${durHours.toString().padStart(2, '0')}h ${time}`
                        : `${durMins.toString().padStart(2, '0')}min`;

                return {
                    title: item.title,
                    time: timeString
                };
            });
        };

        try {
            const { networkLogin, trailId } = req.body;

            const trailPromise = Trail.findOne({ _id: trailId });
            const userPromise = User.findOne({ networkLogin });
            const trackingPromise = Tracking.find({
                userLogin: networkLogin,
                $or: [
                    { expiredCompletion: { $exists: false } },
                    { expiredCompletion: { $eq: null } }
                ]
            });

            const [_trail, tracking, user] = await Promise.all([trailPromise, trackingPromise, userPromise]);

            const { trailWithTracking, containsACompletedItem } = processTrailTracking(_trail, tracking);

            const initialDate = (trail.certificateLayout && trailId)
                ? await getInitialDate(req)
                : null;

            const certificateData = {
                userId: user.networkLogin,
                trailId: trail._id,
                trailName: trail.title,
                // completionDate: trail.completionAt,
                completionDate: '2025-05-04T07:00:00-03:00', //@fixme corrigir mock
                clientId: process.env.CLIENT_ID,
                trailDescription: stripHtmlTags(trail.description ?? ''),
                courseLoad: getCourseLoad(),
                userName: user.name,
                expirationDate: null,
                certificateDue: trail.certificateDue,
                workload: trail.scoreAverage,
                layoutId: trail.certificateLayout,
                itemName: trail.title,
                initialDate: initialDate,
                items: await getItems(trail)
            };

            const { data } = await certificateClient.post('/certificates', certificateData, {
                headers: getHeaders(req),
                responseType: 'arraybuffer'
            });

            const file = Buffer.from(data, 'binary');
            const filename = getCertificateFileName({
                trailName: certificateData.trailName,
                itemName: certificateData.itemName,
                userName: certificateData.userName
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
            res.send(file);
        } catch (error) {
            // console.log('error', error);
            _messages.badRequest(res, req, 'Operação inválida', error.message, 'certifier', 'createCertificateTrail');
        }
    },

    async createCertificate(req, res) {
        try {
            const { userName, trailName, itemName, layoutId, trailId, trailDescription } = req.body;

            const initialDate = (layoutId && trailId)
                ? await getInitialDate(req)
                : null;

            const bodyFormated = {
                ...req.body,
                courseLoad: formatCourseLoad(req.body.courseLoad)
            };

            console.log('Certificado');
            console.log({
                ...bodyFormated,
                initialDate,
                trailDescription: stripHtmlTags(trailDescription ?? ''),
                clientId: process.env.CLIENT_ID
            });

            const { data } = await certificateClient.post(
                '/certificates',
                {
                    ...bodyFormated,
                    initialDate,
                    trailDescription: stripHtmlTags(trailDescription ?? ''),
                    clientId: process.env.CLIENT_ID
                },
                { headers: getHeaders(req), responseType: 'arraybuffer' }
            );

            const file = Buffer.from(data, 'binary');

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${getCertificateFileName({
                trailName,
                itemName,
                userName
            })}.pdf"`);
            res.send(file);
        } catch (error) {
            console.log(error);
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
            console.log(error);
            _messages.badRequest(res, req, 'Operação inválida', error.message, 'certifier', 'updateLayout');
        }
    },
    async updateStatus(req, res) {
        if (!req.body?.id) {
            return _messages.badRequest(res, req, 'Operação inválida', 'Informe o id do layout', 'certifier', 'updateLayout');
        }

        try {
            const { data } = await certificateClient.post(
                '/layouts/status',
                {
                    id: req.body.id,
                    active: req.body.active ?? false
                },
                { headers: { ...getHeaders(req) } }
            );

            _messages.success(res, req, data, 'ok', 'certifier', 'updateLayout');
        } catch (error) {
            console.log(error);
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
            const { data } = await certificateClient.get(
                `/layouts/${process.env.CLIENT_ID}`,
                { headers: getHeaders(req), params: req.query }
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

            const trails = await Trail
                .find({
                    enabled: true,
                    $or: [
                        { _id: { $in: dataTrails } },
                        { certificateLayout: layoutId }
                    ]
                })
                .sort({ createdAt: -1 })
                .limit(4)
                .select('_id title');

            if (trails.length > 0) {
                const errorData = {
                    message: 'Existem trilhas ativas com este modelo de certificado',
                    trails
                };

                return _messages.badRequest(res, req, 'Operação inválida', errorData, 'certifier', 'deleteLayout');
            }

            const { data } = await certificateClient.delete(
                `/layouts/${layoutId}`,
                { headers: getHeaders(req) }
            );

            _messages.success(res, req, data, 'ok', 'certifier', 'deleteLayout');
        } catch (error) {
            _messages.badRequest(res, req, 'Operação inválida', error.message, 'certifier', 'deleteLayout');
        }
    }
};


