const httpStatus = require('http-status-codes')
const { pick } = require('ramda')
const { decodeToken } = require('../../utils/auth')

const _messages = require('../../utils/messages')
const { User } = require('../users/model')
const { Tracking, DocumentTracking, MediaTracking, AudioTracking, SCORMTracking, ExamTracking, SCORMTrackingHistory, SCORMLessonStatus, EventTracking } = require('./model')
const { HistoricEvaluation } = require('../assessments/model')

const {
    pagination,
    ordernation,
} = require('../../utils/functions')
const cryptoJS = require('crypto-js')

const TRACKING_KINDS = Object.freeze({
    DocumentTracking: DocumentTracking,
    MediaTracking: MediaTracking,
    SCORMTracking: SCORMTracking,
    ExamTracking: ExamTracking,
    AudioTracking: AudioTracking,
    EventTracking: EventTracking
})

const TrackingController = {
    async createOrUpdate (req, res) {
        const TrackingModel = TRACKING_KINDS[req.body.kind] || Tracking

        try {
            const q = pick(['item', 'userLogin'], req.body)
            delete req.body._id

            const tracking = await Tracking.findOne(q)

            let isAllowedToSendXAPI = false
            let isXAPICompleteSent = false
            let registerCompletationAt = false
            let completionAt = null
            if (tracking) {
                if (TrackingModel !== SCORMTracking && TrackingModel !== ExamTracking) {
                    const completion = tracking.completion ? tracking.completion : 0
                    const newCompletion = req.body.completion ? req.body.completion : 0

                    isXAPICompleteSent = tracking.isXAPICompleteSent ? tracking.isXAPICompleteSent : false

                    if (isXAPICompleteSent === true) {
                        isAllowedToSendXAPI = false
                    } else {
                        if (completion == 1 || newCompletion === 1) {
                            isAllowedToSendXAPI = true
                        } else {
                            isAllowedToSendXAPI = false
                        }
                    }

                    if (completion != 1 && newCompletion == 1) {
                        registerCompletationAt = true
                    }
                } else {
                    const completion = tracking.lessonStatus ? tracking.lessonStatus : SCORMLessonStatus.INCOMPLETE
                    const newCompletion = req.body.lessonStatus ? req.body.lessonStatus : SCORMLessonStatus.INCOMPLETE

                    isXAPICompleteSent = tracking.isXAPICompleteSent ? tracking.isXAPICompleteSent : false

                    if (isXAPICompleteSent == true) {
                        isAllowedToSendXAPI = false
                    } else {
                        if (completion == SCORMLessonStatus.COMPLETED || newCompletion == SCORMLessonStatus.COMPLETED) {
                            isAllowedToSendXAPI = true
                        } else {
                            isAllowedToSendXAPI = false
                        }
                    }

                    if ((completion != SCORMLessonStatus.COMPLETED && completion != SCORMLessonStatus.PASSED) &&
                       (newCompletion == SCORMLessonStatus.COMPLETED || newCompletion == SCORMLessonStatus.FAILED || newCompletion == SCORMLessonStatus.PASSED)) {
                        registerCompletationAt = true
                    }
                }
            } else {
                isAllowedToSendXAPI = false
            }

            let totalTime = tracking ? tracking.totalTime : 0
            totalTime += (req.body.sessionTime ? req.body.sessionTime : 0)

            if (registerCompletationAt) {
                // req.body.completionAt = new Date();
                completionAt = new Date()
            } else {
                // req.body.completionAt = tracking ? tracking.completionAt : null;
                let newCompletion = req.body.lessonStatus ? req.body.lessonStatus : SCORMLessonStatus.INCOMPLETE
                let setNewDate = (TrackingModel === SCORMTracking) && (newCompletion == SCORMLessonStatus.COMPLETED || newCompletion == SCORMLessonStatus.FAILED || newCompletion == SCORMLessonStatus.PASSED)
                completionAt = tracking ? tracking.completionAt : (setNewDate ? new Date() : null)
            }

            if (tracking && (TrackingModel === SCORMTracking || TrackingModel === ExamTracking)) {
                if (tracking.lessonStatus !== req.body.lessonStatus || tracking.score !== req.body.score) {
                    await SCORMTrackingHistory.create({
                        tracking: tracking._id,
                        ...q,
                        ...pick(['lessonStatus', 'score'], req.body),
                    })
                }
            }

            await TrackingModel.updateOne(q, { ...req.body, totalTime, isAllowedToSendXAPI, completionAt }, { upsert: true, omitUndefined: true })

            res.status(httpStatus.NO_CONTENT).send()
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'tracking', 'createOrUpdate')
        }
    },

    async findOrCreate (req, res) {
        try {
            const { item } = req.query
            const { data } = await decodeToken(req.headers.authorization)

            const user = await User.findOne({ _id: data.ref }, 'networkLogin')
            const userLogin = user.networkLogin

            const tracking = await Tracking.findOne({ item, userLogin })

            const response = tracking
                ? tracking.toObject()
                : { item }

            _messages.success(res, req, { ...response, userLogin })
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'tracking', 'findOrCreate')
        }
    },

    async list (req, res) {
        try {
            const { skip, limit } = pagination(req)
            const { order, sort } = ordernation(req)

            const { userLogin } = req.query
            const query = { userLogin }

            const [total, data] = await Promise.all([
                Tracking.countDocuments(query),
                Tracking
                    .find(query)
                    .populate('item', 'title')
                    .sort({ [order]: sort })
                    .skip(parseInt(skip))
                    .limit(parseInt(limit)),
            ])

            _messages.success(res, req, { total, data })
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'tracking', 'list')
        }
    },

    async deleteQuery (req, res) {
        try {
            const { item, userLogin } = req.query
            var networkLogin = userLogin
            const tracking = await Tracking.findOne({ item, userLogin })

            if (tracking.kind == 'ExamTracking') {
                const userFind = await User.findOne({ networkLogin })
                const user = userFind._id
                await HistoricEvaluation.deleteMany({ item, user })
            }

            await Tracking.deleteMany({ item, userLogin })

            _messages.successEmpty(res, req)
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'tracking', 'deleteQuery')
        }
    },

    async createOrUpdateDocument (req, res) {
        req.body.kind = 'DocumentTracking'
        return TrackingController.createOrUpdate(req, res)
    },

    async createOrUpdateMedia (req, res) {
        req.body.kind = 'MediaTracking'
        return TrackingController.createOrUpdate(req, res)
    },

    async createOrUpdateSCORM (req, res) {
        var decrypted = cryptoJS.AES.decrypt(req.headers.tokendata, 'commit')
        const tmpStatus = decrypted.toString(cryptoJS.enc.Utf8)

        if (tmpStatus != req.body.lessonStatus) {
            res.status(httpStatus.NO_CONTENT).send()
            return
        }

        req.body.kind = 'SCORMTracking'
        return TrackingController.createOrUpdate(req, res)
    },
}

module.exports = TrackingController
