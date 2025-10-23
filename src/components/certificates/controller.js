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
    formatCourseLoad, getCertificateLayout
} = require('./business');
const moment = require('moment');
const { Item } = require('../items/model');
const { CourseModel } = require('../courses/model');
const { Tracking } = require('../tracking/model');
const { populateTrails } = require('../trails/business');
const { processCourseInSections } = require('../sections/business');


// @todo revisar aonde vai ficar
const getCourseLoad = (courseLoad) => {
    const dur = moment.duration(courseLoad, 'minutes');
    const durHours = Math.floor(dur.asHours());
    const durMins = Math.floor(dur.asMinutes()) - durHours * 60;

    return durHours.toString().padStart(2, '0') + ':' + durMins.toString().padStart(2, '0');
};

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

        const getItems = async (trail) => {
            const items = await Item.find({
                '_id': {
                    $in: trail?.items.map((item) => item.itemID)
                }
            });

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

            const userPromise = User.findOne({ networkLogin });
            const trackingPromise = Tracking.find({
                userLogin: networkLogin,
                $or: [
                    { expiredCompletion: { $exists: false } },
                    { expiredCompletion: { $eq: null } }
                ]
            });
            const [tracking, user] = await Promise.all([trackingPromise, userPromise]);

            let [trailPopulated] = await populateTrails(true, { _id: trailId });
            const { trail } = processTrailTrackingV2(trailPopulated, tracking);
            const { modelOptions } = await getCertificateLayout(req, trail.certificateLayout);

            const certificateData = {
                userId: user.networkLogin,
                trailId: trail._id,
                trailName: trail.title,
                completionDate: trail.completionAt,
                clientId: process.env.CLIENT_ID,
                trailDescription: stripHtmlTags(trail.description ?? ''),
                courseLoad: getCourseLoad(trail.durationHours),
                userName: user.name,
                expirationDate: trail.expirationDate,
                certificateDue: trail.certificateDue,
                workload: trail.scoreAverage,  // @todo revisar
                layoutId: trail.certificateLayout,
                itemName: trail.title,
                initialDate: '',
                items: await getItems(trail)
            };

            if (modelOptions.initialDate) {
                if (modelOptions?.initialDateType === 'item') {
                    const firstCompletedItem = trail?.items.reduce((min, current) => {
                        if (!min || (current.completionAt && new Date(current.completionAt) < new Date(min.completionAt))) {
                            return current;
                        }
                        return min;
                    }, null);
                    certificateData.initialDate = firstCompletedItem?.completionAt ?? '';
                }
                if (modelOptions?.initialDateType === "trail") {
                    certificateData.initialDate = trail?.startDate ?? null;
                }
            }

            if (trail.certificateDue && trail.certificateDue.type) {
                const isFixed = trail.certificateDue.type === 'fixed';

                const expirationDate = !isFixed
                    ? moment(certificateData.completionDate)
                        .add(trail.certificateDue.value, 'days')
                        .format()
                    : moment(
                        new Date(trail.certificateDue.value),
                        'YYYYMMDD-h:mm:ss'
                    ).format();

                certificateData.expirationDate = expirationDate;
                certificateData.expired = moment(expirationDate).diff(new Date()) <= 0;
            }

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
            _messages.badRequest(res, req, 'Operação inválida', error.message, 'certifier', 'createCertificateTrail');
        }
    },

    async createCertificateCourse(req, res) {
        try {
            const { networkLogin, courseId } = req.body;

            const userPromise = User.findOne({ networkLogin });
            const coursePromise = CourseModel.findOne({ _id: courseId }).lean();
            const [_course, user] = await Promise.all([coursePromise, userPromise]);

            const [course] = await processCourseInSections([_course], user._id);
            const { modelOptions } = await getCertificateLayout(req, course.certificateLayout);

            const certificateData = {
                userId: user.networkLogin,
                trailId: course._id,
                trailName: course.title,
                completionDate: course.completionAt,
                clientId: process.env.CLIENT_ID,
                trailDescription: stripHtmlTags(course.description ?? ''),
                courseLoad: getCourseLoad(course.certificateElegible.workload),
                userName: user.name,
                expirationDate: null,
                certificateDue: null,
                workload: (course.certificateElegible?.grade || 0) > 0 ? course.certificateElegible?.grade?.toString() : undefined,
                layoutId: course.certificateLayout,
                itemName: course.title,
                initialDate: "",
                items: [{
                    title: course.title,
                    time: getCourseLoad(course.certificateElegible.workload)
                }]
            };

            if (modelOptions?.initialDate) {
                if (modelOptions?.initialDateType === 'item') {
                    certificateData.initialDate = course?.completionAt ?? '';
                }
                if (modelOptions?.initialDateType === "trail") {
                    certificateData.initialDate = course?.dateInitial ?? null;
                }
            }

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
            _messages.badRequest(res, req, 'Operação inválida', error.message, 'certifier', 'createCertificateCourse');
        }
    },

    async createCertificateTrailSummary(req, res) {
        try {
            const { networkLogin, trailId } = req.body;

            const user = await User.findOne({ networkLogin }).lean();
            const tracking = await Tracking.find({
                userLogin: networkLogin,
                $or: [
                    { expiredCompletion: { $exists: false } },
                    { expiredCompletion: { $eq: null } }
                ]
            });
            let [trailPopulated] = await populateTrails(true, { _id: trailId });
            const { trail } = processTrailTrackingV2(trailPopulated, tracking);

            const summary = {
                userName: user.name,
                trailName: trail.title,
                courseLoad: getCourseLoad(trail.durationHours)
            };

            if (trail.completionAt) {
                summary.completionDate = moment(
                    new Date(trail.completionAt),
                    'YYYYMMDD-h:mm:ss'
                ).format();
            }

            if (trail.expirationDate) {
                summary.expirationDate = moment(
                    new Date(trail.expirationDate),
                    'YYYYMMDD-h:mm:ss'
                ).format();
            }

            if (trail.certificateDue && trail.certificateDue.type) {
                const isFixed = trail.certificateDue.type === 'fixed';
                const completionAt = new Date(trail.completionDate);

                const expirationDate = !isFixed
                    ? moment(completionAt)
                        .add(trail.certificateDue.value, 'days')
                        .format()
                    : moment(
                        new Date(trail.certificateDue.value),
                        'YYYYMMDD-h:mm:ss'
                    ).format();

                summary.expirationDate = expirationDate;
                summary.expired = moment(expirationDate).diff(new Date()) <= 0;
            }

            return res.json(summary);
        } catch (error) {
            _messages.badRequest(res, req, 'Operação inválida', error.message, 'certifier', 'createCertificateTrailSummary');
        }
    },

    async createCertificateCourseSummary(req, res) {
        try {
            const { networkLogin, courseId } = req.body;
            const user = await User.findOne({ networkLogin }).lean();
            const _course = await CourseModel.findOne({ _id: courseId }).lean();
            const [course] = await processCourseInSections([_course], user._id);

            const summary = {
                userName: user.name,
                trailName: course.title,
                completionDate: course.completionAt,
                courseLoad: getCourseLoad(course.certificateElegible.workload),
                certificateDue: course.certificateDue
            }

            if (course.certificateDue && course.certificateDue.type) {
                const isFixed = course.certificateDue.type === 'fixed';
                const completionAt = new Date(course.completionAt);

                const expirationDate = !isFixed
                    ? moment(completionAt)
                        .add(trail.certificateDue.value, 'days')
                        .format()
                    : moment(
                        new Date(trail.certificateDue.value),
                        'YYYYMMDD-h:mm:ss'
                    ).format();

                summary.expirationDate = expirationDate;
                summary.expired = moment(expirationDate).diff(new Date()) <= 0;
            }

            return res.json(summary);
        } catch (error) {
            _messages.badRequest(res, req, 'Operação inválida', error.message, 'certifier', 'createCertificateTrailSummary');
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


