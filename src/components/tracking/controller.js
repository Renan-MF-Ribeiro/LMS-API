const httpStatus = require('http-status-codes')
const { pick } = require('ramda')
const { decodeToken } = require('../../utils/auth')

const _messages = require('../../utils/messages')
const { User } = require('../users/model')
const { Trail } = require('../trails/model')
const { processTrailTracking } = require('../../utils/functions')
const { Tracking, DocumentTracking, MediaTracking, AudioTracking, SCORMTracking, ExamTracking, SCORMTrackingHistory, SCORMLessonStatus, EventTracking, ActivityTracking } = require('./model')
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
    EventTracking: EventTracking,
    ActivityTracking: ActivityTracking,
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

                if((TrackingModel == DocumentTracking || TrackingModel == MediaTracking) && req.body.completion == 1 ){
                    registerCompletationAt = true
                } 
                
                if((TrackingModel == SCORMTracking) && (req.body.lessonStatus == "completed" || req.body.lessonStatus == "passed" || req.body.lessonStatus == "failed") ){
                    registerCompletationAt = true
                } 
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
            // Assistiu uma colaboração no mesmo dia do lançamento
            // Assistiu X colaborações
            // Eventos de treinamento
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

            const { userLogin, searchBy } = req.query

            let trailsWithTracking = []
            let processedTrailsWithTracking = []
            let allItems = 0
            let data

            const allTrackingUser = await Tracking.find({
                userLogin: { $eq: userLogin },
            })

            const query = searchBy ? {
                $or: [
                    { title: { $regex: searchBy, $options: 'i' } },
                ],
                "items.itemID": { $in: allTrackingUser.map(v => v.item) }
            } : {
                "items.itemID": { $in: allTrackingUser.map(v => v.item) }
            }

            const totalTrails = await Trail.countDocuments(query)

            const trails = await Trail.find(query).populate({
                path:'items',			
                populate: { 
                    path:'itemID',
                    model: 'Item' 
                }
            })
            .sort({ [order]: sort })
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .lean()
        
            for(let trail of trails){
                let processedTrail = processTrailTracking(trail, allTrackingUser)
                trailsWithTracking.push(processedTrail)
            }

            for(let v of trailsWithTracking){
                let trail = v.trail
                const completedTrails = []
                allItems = trail.items.length
                let itemData
                let itemDataArr = []
                
                for(let item in trail.items){
                    if(trail.items[item].itemID.completion) {
                        completedTrails.push(trail.items[item])
                    }
                    trail.items[item] = trail.items[item].itemID
                    itemData = {
                        completion: trail.items[item].completion === 1 ? true : false,
                        completionAt: trail.items[item].completionAt,
                        kind: trail.items[item].kind,
                        _id: trail.items[item]._id,
                        score: trail.items[item].score,
                        createdAt: trail.items[item].createdAt,
                        updatedAt: trail.items[item].updatedAt,
                        title: trail.items[item].title,
                    }
                    itemDataArr.push(itemData)
                }

                data = {
                    trailName: trail.title,
                    items: itemDataArr,
                    completionAt: trail.completionAt,
                    updatedAt: trail.lastTrackingUpdate,
                    completion: (100 * completedTrails.length) / allItems,
                }
                processedTrailsWithTracking.push(data)
            }
            _messages.success(res, req, { totalTrails, processedTrailsWithTracking })
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
    async listActivitiesHistoric (req, res) {
        try {
            const { skip, limit } = pagination(req)
            const { order, sort } = ordernation(req)

            const searchBy = req.query.searchBy

            const query = searchBy ? {
                $and: [
                    {
                        $or: [
                            { itemName: { $regex: searchBy, $options: 'i' } },
                            { score: { $regex: searchBy, $options: 'i' } },
                            { studentName: { $regex: searchBy, $options: 'i' } },
                        ],
                    },
                    {
                        $or: [
                            { lessonStatus: 'failed' },
                            { lessonStatus: 'passed' },
                        ],
                    },
                    { kind: 'ActivityTracking' },
                ],
            } : {
                $or: [
                    { lessonStatus: 'failed' },
                    { lessonStatus: 'passed' },
                ],
                kind: 'ActivityTracking',
            }

            const tracking = await Tracking.find(query).populate({
                path: 'item',
                populate: {
                    path: 'itemID',
                    model: 'Item',
                },
            })
                .sort({ [order]: sort })
                .skip(parseInt(skip))
                .limit(parseInt(limit))
                .lean()

            const activities = []
            for (const activity of tracking) {
                const user = await User.findOne({ networkLogin: activity.userLogin })
                const activityObj = {
                    trackingId: activity._id,
                    itemId: activity.item ? activity.item._id : null,
                    itemName: activity.item ? activity.item._id : null,
                    studentName: user.name,
                    studentEmail: user.email,
                    sentAt: activity.sentAt,
                    reviewer: activity.reviewer,
                    correctedAt: activity.correctedAt,
                    contentPath: activity.contentPath,
                    passingScore: activity.item.passingScore,
                    score: activity.score,
                    reviewerComment: activity.reviewerComment,
                }
                activities.push(activityObj)
            }
            _messages.success(res, req, activities)
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'listActivities')
        }
    },

    async listActivitiesForCorrection (req, res) {
        try {
            const { skip, limit } = pagination(req)
            const { order, sort } = ordernation(req)

            const searchBy = req.query.searchBy

            const query = searchBy ? {
                $or: [
                    { itemName: { $regex: searchBy, $options: 'i' } },
                    { score: { $regex: searchBy, $options: 'i' } },
                    { studentName: { $regex: searchBy, $options: 'i' } },
                ],
                kind: 'ActivityTracking',
                lessonStatus: 'incomplete',
            } : {
                lessonStatus: 'incomplete',
                kind: 'ActivityTracking',
            }

            const tracking = await Tracking.find(query).populate({
                path: 'item',
                populate: {
                    path: 'itemID',
                    model: 'Item',
                },
            })
                .sort({ [order]: sort })
                .skip(parseInt(skip))
                .limit(parseInt(limit))
                .lean()

            const activities = []
            for (const activity of tracking) {
                const user = await User.findOne({ networkLogin: activity.userLogin })
                const activityObj = {
                    trackingId: activity._id,
                    itemId: activity.item ? activity.item._id : null,
                    itemName: activity.item ? activity.item._id : null,
                    studentName: user.name,
                    studentEmail: user.email,
                    sentAt: activity.sentAt,
                    correctedAt: activity.correctedAt,
                    contentPath: activity.contentPath,
                    passingScore: activity.passingScore,
                    score: activity.score,
                    reviewerComment: activity.reviewerComment,
                }
                activities.push(activityObj)
            }
            _messages.success(res, req, activities)
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'listActivities')
        }
    },

    async updateActivityAdmin (req, res) {
        try {
            const { trackingId } = req.query
            const todayDate = new Date()
            const body = req.body
            const tracking = await Tracking.findOne({ _id: trackingId }).populate({
                path: 'item',
                populate: {
                    path: 'itemID',
                    model: 'Item',
                },
            })
                .lean()

            const queryStatus = body.score >= tracking.item.passingScore ? {
                lessonStatus: 'passed',
                completion: 1,
            } : body.score < tracking.item.passingScore ? {
                lessonStatus: 'failed',
                completion: 0,
            } : undefined

            if (queryStatus) {
                await ActivityTracking.findOneAndUpdate({ _id: trackingId }, {
                    score: body.score,
                    reviewer: body.name,
                    completionAt: todayDate,
                    reviewerComment: body.reviewerComment,
                    $push: { correctedAt: todayDate },
                    ...queryStatus,
                })
            }

            _messages.success(res, req, 'Atividade atualizada com sucesso!')
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'updateActivityAdmin')
        }
    },

    async updateActivityUser (req, res) {
        try {
            const { item, userLogin } = req.query
            const todayDate = new Date()
            const tracking = await Tracking.findOne({ item, userLogin }).populate({
                path: 'item',
                populate: {
                    path: 'itemID',
                    model: 'Item',
                },
            })
                .lean()

            const { file } = req.files
            activityPath = await azureBlob(file, 'items/activity')
            activityPath = process.env.NODE_ENV === 'local' ? activityPath : activityPath.replace(AZURE_BLOB_URL, DOMAIN)

            if (tracking.completion !== 1) {
                if (tracking.lessonStatus == 'failed') {
                    await ActivityTracking.findOneAndUpdate({ _id: tracking._id }, { lessonStatus: 'incomplete', contentPath: activityPath, $unset: { score: 1 }, $push: { sentAt: todayDate } })
                } else {
                    await ActivityTracking.findOneAndUpdate({ _id: tracking._id }, { contentPath: activityPath, $push: { sentAt: todayDate } })
                }
            } else {
                _messages.badRequest(res, req, 'Esta atividade já foi concluida')
            }

            _messages.success(res, req, 'Atividade enviada com sucesso!')
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'updateActivityUser')
        }
    },
}

module.exports = TrackingController
