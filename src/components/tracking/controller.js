const mongoose = require('mongoose');
const httpStatus = require('http-status-codes');
const { pick } = require('ramda');
const { decodeToken } = require('../../utils/auth');
const { DOMAIN, AZURE_BLOB_URL } = process.env;
const { azureBlob } = require('../../utils/files');
const _messages = require('../../utils/messages');
const { User } = require('../users/model');
const { Trail } = require('../trails/model');
const { dispatch } = require('../webhooks/controller');
const {
    processTrailTracking,
    isValidDate,
    pagination,
    ordernation,
    getUserByToken,
} = require('../../utils/functions');
const { calendarEventConclusion } = require('../calendar/events/controller');
const {
    Tracking,
    DocumentTracking,
    MediaTracking,
    AudioTracking,
    SCORMTracking,
    ExamTracking,
    SCORMTrackingHistory,
    SCORMLessonStatus,
    EventTracking,
    ActivityTracking,
    FormTracking,
} = require('./model');
const { HistoricEvaluation, Evaluation } = require('../assessments/model');
const cryptoJS = require('crypto-js');
const { Item, FORM_ITEM_TYPE } = require('../items/model');
const { EVENT_CATEGORY } = require('../gamification/model');

const { createCompleteTracking, getFilteredTrackingEvents } = require('./business')

const _functions = require('../../utils/functions');
const GamificationKafka = require('../gamification/kafka/broker');
const { Group } = require('../groups/model');

const TRACKING_KINDS = Object.freeze({
    DocumentTracking: DocumentTracking,
    MediaTracking: MediaTracking,
    SCORMTracking: SCORMTracking,
    ExamTracking: ExamTracking,
    AudioTracking: AudioTracking,
    EventTracking: EventTracking,
    ActivityTracking: ActivityTracking,
    FormTracking: FormTracking,
});

const isCompletedStatus = (status) => {
    if(!status) return false;
    
    return ['completed', 'passed', 'failed'].includes(status.toLowerCase());
}

const TrackingController = {
    async createOrUpdate(req, res) {
        const TrackingModel = TRACKING_KINDS[req.body.kind] || Tracking;

        try {
            const q = pick(['item', 'userLogin'], req.body);

            const { isChiefItem } = req.query;
            delete req.body._id;

            const filterQuery = {
                ...q,
                $or: [
                    { expiredCompletion: { $exists: false } },
                    { expiredCompletion: { $eq: null } },
                ],
            };

            const tracking = await Tracking.findOne(filterQuery);

            delete req.body.migratedDate;

            const trackingItem = await Item.findOne({ _id: req.body.item }).lean();

            if (trackingItem?.scormBlockReplaceLessonStatus && isCompletedStatus(tracking?.lessonStatus)) {
                req.body.lessonStatus = tracking?.lessonStatus || 'incomplete';
            }

            let isAllowedToSendXAPI = false;
            let isXAPICompleteSent = false;
            let registerCompletationAt = false;
            let completionAt = null;
            if (tracking) {
                if (TrackingModel !== SCORMTracking && TrackingModel !== ExamTracking) {
                    const completion = tracking.completion ? tracking.completion : 0;
                    const newCompletion = req.body.completion ? req.body.completion : 0;

                    isXAPICompleteSent = tracking.isXAPICompleteSent
                        ? tracking.isXAPICompleteSent
                        : false;

                    if (isXAPICompleteSent === true) {
                        isAllowedToSendXAPI = false;
                    } else {
                        if (completion == 1 || newCompletion === 1) {
                            isAllowedToSendXAPI = true;
                        } else {
                            isAllowedToSendXAPI = false;
                        }
                    }

                    if (completion != 1 && newCompletion == 1) {
                        registerCompletationAt = true;
                    }
                } else {
                    const completion = tracking.lessonStatus
                        ? tracking.lessonStatus
                        : SCORMLessonStatus.INCOMPLETE;
                    const newCompletion = req.body.lessonStatus
                        ? req.body.lessonStatus
                        : SCORMLessonStatus.INCOMPLETE;
                    isXAPICompleteSent = tracking.isXAPICompleteSent
                        ? tracking.isXAPICompleteSent
                        : false;

                    if (isXAPICompleteSent == true) {
                        isAllowedToSendXAPI = false;
                    } else {
                        if (
                            completion == SCORMLessonStatus.COMPLETED ||
                            newCompletion == SCORMLessonStatus.COMPLETED
                        ) {
                            isAllowedToSendXAPI = true;
                        } else {
                            isAllowedToSendXAPI = false;
                        }
                    }
                    // console.log("completion", completion, "newCompletion", newCompletion, "\n\n\n\n")
                    const isNewStatus = req.body?.lessonStatus !== tracking.lessonStatus;

                    if (
                        isNewStatus &&
                        (newCompletion == SCORMLessonStatus.COMPLETED ||
                            newCompletion == SCORMLessonStatus.FAILED ||
                            newCompletion == SCORMLessonStatus.PASSED)
                    ) {
                        registerCompletationAt = true;
                    }

                    //avaliação já passa o status como 'passed' antes de rodar o createOrUpdate
                    //o status é atualizado na finalize-evaluation (assesments/controller.js)
                    //então o isNewStatus não passa como true, por ter os dois valores como passed
                    if (
                        TrackingModel == ExamTracking &&
                        (req.body.lessonStatus == 'completed' ||
                            req.body.lessonStatus == 'passed' ||
                            req.body.lessonStatus == 'failed')
                    ) {
                        registerCompletationAt = true;
                    }
                }
            } else {
                isAllowedToSendXAPI = false;

                if (
                    (TrackingModel == DocumentTracking ||
                        TrackingModel == MediaTracking ||
                        TrackingModel == FormTracking ||
                        TrackingModel == EventTracking) &&
                    req.body.completion == 1
                ) {
                    registerCompletationAt = true;
                }

                if (
                    TrackingModel == SCORMTracking &&
                    (req.body.lessonStatus == 'completed' ||
                        req.body.lessonStatus == 'passed' ||
                        req.body.lessonStatus == 'failed')
                ) {
                    registerCompletationAt = true;
                }
            }

            const totalTime = Number(tracking?.totalTime || 0) + Number(req.body?.sessionTime || 0);

            if (registerCompletationAt) {
                // req.body.completionAt = new Date();
                completionAt = new Date();
            } else {
                // req.body.completionAt = tracking ? tracking.completionAt : null;
                const newCompletion = req.body.lessonStatus
                    ? req.body.lessonStatus
                    : SCORMLessonStatus.INCOMPLETE;
                const setNewDate =
                    TrackingModel === SCORMTracking &&
                    (newCompletion == SCORMLessonStatus.COMPLETED ||
                        newCompletion == SCORMLessonStatus.FAILED ||
                        newCompletion == SCORMLessonStatus.PASSED);
                completionAt = tracking ? tracking.completionAt : setNewDate ? new Date() : null;
            }

            if (tracking && (TrackingModel === SCORMTracking || TrackingModel === ExamTracking)) {
                if (
                    tracking.lessonStatus !== req.body.lessonStatus ||
                    tracking.score !== req.body.score
                ) {
                    await SCORMTrackingHistory.create({
                        tracking: tracking._id,
                        ...q,
                        ...pick(['lessonStatus', 'score'], req.body),
                    });
                }
            }

            if (isChiefItem && registerCompletationAt) {
                for (const item of req.body.optionalItems) {
                    const i = await Item.findById(item._id).lean();
                    const trackingKind = processTrackingType(i);

                    await createCompleteTracking(i, trackingKind, q.userLogin)
                }
            }

            if (TrackingModel === ExamTracking) {
                const { idEvaluation } = await Item.findOne({
                    _id: req.body.item,
                });
                const { attempts } = await Evaluation.findOne({
                    _id: idEvaluation,
                });

                if (!tracking) {
                    req.body.remainingAttempts = attempts || -1;
                } else if (
                    attempts &&
                    tracking.remainingAttempts &&
                    req.body.lessonStatus === 'failed'
                ) {
                    req.body.remainingAttempts = tracking.remainingAttempts - 1;
                    req.body.lessonStatus = req.body.remainingAttempts ? 'incomplete' : 'failed';
                }
            }

            if (TrackingModel === FormTracking) {
                const formItem = await Item.findById(q.item);
                for (let i = 0; i < req.body.statements.length; i++) {
                    const statement = req.body.statements[i];
                    const itemStatement = formItem?.statements.find(({ _id }) =>
                        _id.equals(statement._id)
                    );
                    if (
                        [FORM_ITEM_TYPE.MULTIPLE, FORM_ITEM_TYPE.OBJECTIVE].includes(
                            itemStatement.type
                        )
                    ) {
                        req.body.statements[i].reply = statement?.reply?.map(
                            (_id) => new mongoose.Types.ObjectId(_id)
                        );
                    }
                }
                if (!!req.body.completionAt) req.body.completion = 1;
                if (req.body.completion === 1) completionAt = new Date();
            }

            delete req.body.optionalItems;
            const updatedTracking = await TrackingModel.findOneAndUpdate(
                filterQuery,
                { ...req.body, totalTime, isAllowedToSendXAPI, completionAt },
                { new: true, upsert: true, omitUndefined: true }
            );

            const eventsToDispatch = await getFilteredTrackingEvents({
                trackingItem,
                TrackingModel,
                reqBody: req.body,
                completionAt,
                userLogin: q.userLogin,
                itemId: req.body.item,
                isNewTracking: !tracking,
            });
            
            await GamificationKafka.publishEventRuleValidation({
                events: eventsToDispatch,
                identifier: q.userLogin,
                meta: {
                    tracking: updatedTracking,
                },
            });

            await dispatch('create', 'tracking', {
                ...req.body,
                totalTime,
                isAllowedToSendXAPI,
                completionAt,
            });

            // Dispara o evento de calendário SOMENTE se é evento de conclusão
            if (completionAt) {
                await calendarEventConclusion(q.userLogin, {
                    item: q.item,
                    completion: req.body?.completion,
                    lessonStatus: req.body?.lessonStatus,
                });
            }

            res.status(httpStatus.NO_CONTENT).send();
        } catch (error) {
            // _messages.internalServer(
            //     res,
            //     req,
            //     error.message,
            //     'Erro interno no servidor',
            //     'tracking',
            //     'createOrUpdate'
            // );

            console.log('ERROR - tracking createOrUpdate', error, req.body);

            await _functions.recordLog(
                req,
                'ERROR',
                error.message,
                'tracking',
                'createOrUpdate',
                null,
                req.body
            );

            res.status(httpStatus.INTERNAL_SERVER_ERROR).send('Erro interno no servidor');
        }
    },

    async findOrCreate(req, res) {
        try {
            const { item, trailId, chief } = req.query;
            const { data } = await decodeToken(req.headers.authorization);

            const user = await User.findOne({ _id: data.ref }, 'networkLogin');
            const userLogin = user.networkLogin;

            const optionalItems = [];

            if (chief === 'true') {
                const trail = await Trail.findById(trailId)
                    .populate({
                        path: 'items',
                        populate: {
                            path: 'itemID',
                            model: 'Item',
                        },
                    })
                    .lean();

                for (const item of trail.items) {
                    if (item.optional) {
                        optionalItems.push({
                            title: item.itemID.title,
                            _id: item.itemID._id,
                        });
                    }
                }
            }

            const tracking = await Tracking.findOne({
                item,
                userLogin,
                $or: [
                    { expiredCompletion: { $exists: false } },
                    { expiredCompletion: { $eq: null } },
                ],
            });

            if (tracking?.kind === 'FormTracking') {
                const formItem = await Item.findById(item).lean();
                for (let i = 0; i < formItem?.statements.length; i++) {
                    const itemStatement = formItem?.statements[i];
                    const trackingStatement = tracking?.statements?.find(({ _id }) =>
                        itemStatement._id.equals(_id)
                    );

                    if (
                        [FORM_ITEM_TYPE.MULTIPLE, FORM_ITEM_TYPE.OBJECTIVE].includes(
                            itemStatement.type
                        )
                    ) {
                        tracking.statements[i] = {
                            ...itemStatement,
                            alternatives: itemStatement?.alternatives.map((alternative) => {
                                const trackingReply = trackingStatement?.reply;

                                return {
                                    ...alternative,
                                    checked: !!trackingReply?.find((_id) =>
                                        alternative._id.equals(_id)
                                    ),
                                };
                            }),
                        };
                    } else {
                        const response = trackingStatement?.reply;
                        tracking.statements[i] = {
                            ...itemStatement,
                            response:
                                itemStatement.type == FORM_ITEM_TYPE.DICHOTOMOUS
                                    ? !!response
                                    : response,
                        };
                    }
                }
            }

            const response = tracking ? tracking.toObject() : { item };

            _messages.success(res, req, { ...response, userLogin, optionalItems });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'tracking',
                'findOrCreate'
            );
        }
    },

    async list(req, res) {
        try {
            const { skip, limit } = pagination(req);
            const { order, sort } = ordernation(req);
            const { userLogin, searchBy, filterByEligibility } = req.query;

            const processedTrailsWithTracking = [];
            let data;

            const allTrackingUser = await Tracking.find(
                {
                    userLogin: { $eq: userLogin },
                    kind: { $ne: 'PostTracking' },
                    $or: [
                        { expiredCompletion: { $exists: false } },
                        { expiredCompletion: { $eq: null } },
                    ],
                },
                '-__v -lastState -isAllowedToSendXAPI -interactions -suspendedData'
            );

            const items = await Item.find({
                _id: {
                    $in: allTrackingUser.map((v) => v.item),
                },
                enabled: true,
                $or: [
                    {
                        archive: false,
                    },
                    {
                        archive: {
                            $exists: false,
                        },
                    },
                ],
                kind: { $nin: ['PostItem', 'SoonItem'] },
            }).lean();

            let query = {
                'items.itemID': {
                    $in: items.map((i) => i._id),
                },
            };

            if (searchBy) {
                query = { ...query, $or: [{ title: { $regex: searchBy, $options: 'i' } }] };
            }

            if (filterByEligibility === 'true') {
                try {
                    const user = await User.findOne({ networkLogin: userLogin });
                    if (user) {
                        let userTags = [];

                        const userGroups =
                            (await Group.find({ name: { $in: user?.groupsAD } }, 'name tags')) ||
                            [];
                        userTags =
                            userGroups?.flatMap((group) => group?.tags?.map((tag) => tag?.value)) ||
                            [];

                        query['tags.value'] = { $in: userTags };
                    }
                } catch (error) {
                    console.error('Error filtering trails by eligibility:', error);
                }
            }

            let [trails, totalTrails] = await Promise.all([
                Trail.find(query)
                    .sort({ [order]: sort })
                    .skip(parseInt(skip))
                    .limit(parseInt(limit))
                    .lean(),
                Trail.find(query).countDocuments(),
            ]);

            const itemsMap = new Map(items?.map((i) => [i?._id?.toString(), i]));

            const missingItemsIds = trails
                ?.flatMap((t) => t?.items)
                ?.map((i) => i?.itemID)
                ?.filter((i) => !itemsMap.has(i?.toString()));

            const missingItems = await Item.find({
                _id: { $in: Array.from(missingItemsIds) },
                enabled: true,
                archive: { $ne: true },
                kind: { $nin: ['PostItem', 'SoonItem'] },
            }).lean();

            missingItems.forEach((i) => {
                itemsMap.set(i._id.toString(), i);
            });

            trails = trails.map((trail) => {
                trail.items = trail.items.map((item) => ({
                    ...item,
                    itemID: itemsMap.get(item?.itemID?.toString()),
                }));
                return trail;
            });

            const trailsWithTracking = trails.map((t) => processTrailTracking(t, allTrackingUser));
            if (trailsWithTracking.length === 0) {
                return _messages.success(res, req, {
                    totalTrails,
                    processedTrailsWithTracking,
                });
            }

            for (const { trail } of trailsWithTracking) {
                const trailItems = trail?.items;
                const totalItems = trailItems.length;

                const { completedItems, itemDataArr, fullCourseLoad } = trailItems?.reduce(
                    (acc, i) => {
                        const item = i?.itemID;
                        if (!item) return acc;

                        const completion = i.completion === 1;
                        if (completion) {
                            acc.completedItems++;
                        }

                        acc.itemDataArr.push({ ...item, completion, process: i.process || null });
                        acc.fullCourseLoad += item.durationHours;

                        return acc;
                    },
                    { completedItems: 0, itemDataArr: [], fullCourseLoad: 0 }
                );

                if (itemDataArr.length === 0) {
                    totalTrails--;
                    continue;
                }

                let certificate = null;
                const mustGenerateCertificate =
                    completedItems == totalItems && trail.certificate === 1;

                if (mustGenerateCertificate) {
                    const user = await User.findOne({ networkLogin: userLogin }, 'name');
                    certificate = {
                        clientId: process.env.CLIENT_ID,
                        completionDate: trail.completionAt,
                        courseLoad: fullCourseLoad,
                        userName: user.name,
                        userId: userLogin,
                        expirationDate: trail.expirationDate,
                        certificateDue: trail.certificateDue,
                        workload: trail.scoreAverage,
                        layoutId: trail.certificateLayout,
                        trailId: trail._id,
                        trailName: trail.title,
                        itemId: trail.itemId,
                        itemName: trail.title,
                    };
                }

                data = {
                    trailName: trail.title,
                    items: itemDataArr,
                    scoreAverage: trail.scoreAverage,
                    completionAt: trail.completionAt,
                    updatedAt: trail.lastTrackingUpdate,
                    completion: Math.round((100 * completedItems) / totalItems),
                    hasCertificate: !!certificate,
                    certificate,
                };
                processedTrailsWithTracking.push(data);
            }

            return _messages.success(res, req, {
                totalTrails,
                processedTrailsWithTracking,
            });
        } catch (error) {
            console.log(error);
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'tracking',
                'list'
            );
        }
    },

    async deleteQuery(req, res) {
        try {
            const { item, userLogin } = req.query;
            var networkLogin = userLogin;
            const tracking = await Tracking.findOne({
                item,
                userLogin,
                $or: [
                    { expiredCompletion: { $exists: false } },
                    { expiredCompletion: { $eq: null } },
                ],
            });

            if (tracking.kind === 'ExamTracking') {
                const userFind = await User.findOne({ networkLogin });
                const user = userFind._id;
                await HistoricEvaluation.deleteMany({
                    item,
                    user,
                    $or: [
                        { expiredCompletion: { $exists: false } },
                        { expiredCompletion: { $eq: null } },
                    ],
                });
            }

            await Tracking.deleteMany({
                item,
                userLogin,
                $or: [
                    { expiredCompletion: { $exists: false } },
                    { expiredCompletion: { $eq: null } },
                ],
            });

            _messages.successEmpty(res, req);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'tracking',
                'deleteQuery'
            );
        }
    },

    async createOrUpdateDocument(req, res) {
        req.body.kind = 'DocumentTracking';
        return TrackingController.createOrUpdate(req, res);
    },

    async createOrUpdateMedia(req, res) {
        req.body.kind = 'MediaTracking';
        return TrackingController.createOrUpdate(req, res);
    },

    async createOrUpdateSCORM(req, res) {
        var decrypted = cryptoJS.AES.decrypt(req.headers.tokendata, 'commit');
        const tmpStatus = decrypted.toString(cryptoJS.enc.Utf8);

        if (tmpStatus != req.body.lessonStatus) {
            res.status(httpStatus.NO_CONTENT).send();
            return;
        }

        req.body.kind = 'SCORMTracking';
        return TrackingController.createOrUpdate(req, res);
    },

    async listActivitiesHistoric(req, res) {
        try {
            const { skip, limit } = pagination(req);
            let { order, sort } = ordernation(req);
            const searchBy = req.query.searchBy;

            // Montar a query principal com base no searchBy
            const query = {
                kind: 'ActivityTracking',
                $or: [{ lessonStatus: 'failed' }, { lessonStatus: 'passed' }],
            };

            order = order === 'createdAt' ? 'maxSentAt' : order;

            // Mapear campos de ordenação para nomes reais no banco de dados
            const orderMapping = {
                maxCorrectedAt: 'correctedAt',
                maxSentAt: 'sentAt',
                itemName: 'itemName',
                studentName: 'studentName',
                trails: 'trails',
            };
            order = orderMapping[order] || order;

            // Buscar os Trackings
            let tracking = await Tracking.find(query)
                .sort({ [order]: sort === 'asc' ? 1 : -1 })
                .lean();

            // Extrair todos os userLogins e itemIDs para consultas em massa
            const userLogins = tracking.map((a) => a.userLogin);
            const itemIds = tracking.map((a) => a.item?._id).filter((id) => id);

            // Buscar todos os usuários e criar um mapa por networkLogin
            const users = await User.find({ networkLogin: { $in: userLogins } })
                .select('networkLogin name email')
                .lean();
            const usersMap = Object.fromEntries(users.map((user) => [user.networkLogin, user]));

            // Buscar todas as trilhas que contêm os itens em uma única consulta
            const trails = await Trail.find({ 'items.itemID': { $in: itemIds } })
                .select('title items.itemID')
                .lean();

            const itemsTitle = await Item.find({ _id: { $in: itemIds } })
                .select('title _id')
                .lean();

            const titles = {};
            itemsTitle.forEach((item) => {
                titles[item._id] = item.title;
            });

            // Criar um mapa de trilhas por itemID
            const trailsByItem = {};
            trails.forEach((trail) => {
                trail.items.forEach((item) => {
                    if (!trailsByItem[item.itemID]) {
                        trailsByItem[item.itemID] = [];
                    }
                    trailsByItem[item.itemID].push(trail.title);
                });
            });

            // Construir as atividades combinando os dados
            let activities = tracking.map((activity) => {
                const itemId = activity.item?._id;
                return {
                    trackingId: activity._id,
                    itemId: itemId || null,
                    itemName: titles[itemId] || null,
                    studentName: usersMap[activity.userLogin]?.name || null,
                    studentEmail: usersMap[activity.userLogin]?.email || null,
                    sentAt: activity.sentAt,
                    reviewer: activity.reviewer,
                    correctedAt: activity.correctedAt,
                    contentPath: activity.contentPath,
                    passingScore: activity.item?.passingScore || null,
                    score: activity.score,
                    reviewerComment: activity.reviewerComment,
                    trails: (trailsByItem[itemId] || []).join(', '),
                };
            });

            // Aplicar o `searchBy` antes da ordenação manual
            if (searchBy) {
                const searchTerm = searchBy.trim().toLowerCase();

                activities = activities.filter(
                    (activity) =>
                        activity.studentName?.toLowerCase().includes(searchTerm) ||
                        activity.itemName?.toLowerCase().includes(searchTerm) ||
                        activity.reviewer?.toLowerCase().includes(searchTerm) ||
                        (trailsByItem[activity.itemId] || [])
                            .join(', ')
                            .toLowerCase()
                            .includes(searchTerm)
                );
            }

            // Ordenar os resultados manualmente se necessário
            if (['studentName', 'itemName', 'trails'].includes(order)) {
                activities.sort((a, b) => {
                    const valueA = getSortableKey(a, order, trailsByItem);
                    const valueB = getSortableKey(b, order, trailsByItem);
                    return sort === 'asc'
                        ? valueA.localeCompare(valueB)
                        : valueB.localeCompare(valueA);
                });
            }

            const trackingCount = activities.length;
            activities = activities.slice(parseInt(skip), parseInt(skip) + parseInt(limit));

            _messages.success(res, req, { activities, total: trackingCount });
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'listActivities'
            );
        }
    },

    async listActivitiesForCorrection(req, res) {
        try {
            const { skip, limit } = pagination(req);
            let { order, sort } = ordernation(req);
            const searchBy = req.query.searchBy;

            const query = {
                lessonStatus: 'incomplete',
                kind: 'ActivityTracking',
                sentAt: { $exists: true, $not: { $size: 0 } },
            };

            order = order === 'createdAt' ? 'sentAt' : order;

            const orderMapping = {
                maxSentAt: 'sentAt',
                itemName: 'itemName',
                studentName: 'studentName',
                trails: 'trails',
            };
            order = orderMapping[order] || order;

            let tracking = await Tracking.find(query)
                .sort({ [order]: sort === 'asc' ? 1 : -1 })
                .lean();

            const userLogins = tracking.map((a) => a.userLogin);
            const itemIds = tracking.map((a) => a.item?._id).filter((id) => id);

            const users = await User.find({ networkLogin: { $in: userLogins } })
                .select('networkLogin name email')
                .lean();
            const usersMap = Object.fromEntries(users.map((user) => [user.networkLogin, user]));

            const trails = await Trail.find({ 'items.itemID': { $in: itemIds } })
                .select('title items.itemID')
                .lean();

            const itemsTitle = await Item.find({ _id: { $in: itemIds } })
                .select('title _id')
                .lean();

            const titles = {};
            itemsTitle.forEach((item) => {
                titles[item._id] = item.title;
            });

            const trailsByItem = {};
            trails.forEach((trail) => {
                trail.items.forEach((item) => {
                    if (!trailsByItem[item.itemID]) {
                        trailsByItem[item.itemID] = [];
                    }
                    trailsByItem[item.itemID].push(trail.title);
                });
            });

            let activities = tracking.map((activity) => {
                const itemId = activity.item?._id;
                return {
                    trackingId: activity._id,
                    itemId: itemId || null,
                    itemName: titles[itemId] || null,
                    studentName: usersMap[activity.userLogin]?.name || null,
                    studentEmail: usersMap[activity.userLogin]?.email || null,
                    sentAt: activity.sentAt,
                    contentPath: activity.contentPath,
                    passingScore: activity.item?.passingScore || null,
                    score: activity.score,
                    trails: (trailsByItem[itemId] || []).join(', '),
                };
            });

            // Aplicar o `searchBy` antes da ordenação manual
            if (searchBy) {
                const searchTerm = searchBy.trim().toLowerCase();

                activities = activities.filter(
                    (activity) =>
                        activity.studentName?.toLowerCase().includes(searchTerm) ||
                        activity.itemName?.toLowerCase().includes(searchTerm) ||
                        (trailsByItem[activity.itemId] || [])
                            .join(', ')
                            .toLowerCase()
                            .includes(searchTerm)
                );
            }

            if (['studentName', 'itemName', 'trails'].includes(order)) {
                activities.sort((a, b) => {
                    const valueA = getSortableKey(a, order, trailsByItem);
                    const valueB = getSortableKey(b, order, trailsByItem);
                    return sort === 'asc'
                        ? valueA.localeCompare(valueB)
                        : valueB.localeCompare(valueA);
                });
            }

            const trackingCount = activities.length;
            activities = activities.slice(parseInt(skip), parseInt(skip) + parseInt(limit));

            _messages.success(res, req, { activities, total: trackingCount });
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'listActivitiesForCorrection'
            );
        }
    },

    async updateActivityAdmin(req, res) {
        try {
            const { trackingId } = req.query;
            const todayDate = new Date();
            const body = req.body;
            const tracking = await Tracking.findOne({ _id: trackingId })
                .populate({
                    path: 'item',
                    populate: {
                        path: 'itemID',
                        model: 'Item',
                    },
                })
                .lean();
            const trails = await Trail.find({
                'items.itemID': tracking.item._id,
                'items.chief': true,
            }).lean();
            const optionalItems = [];

            for (let trail of trails) {
                for (let item of trail.items) {
                    if (item.optional) {
                        optionalItems.push(item.itemID);
                    }
                }
            }

            const queryStatus =
                body.score >= tracking.item.passingScore
                    ? {
                          lessonStatus: 'passed',
                          completion: 1,
                      }
                    : body.score < tracking.item.passingScore
                    ? {
                          lessonStatus: 'failed',
                          completion: 0,
                      }
                    : undefined;

            if (queryStatus) {
                const updatedTracking = await ActivityTracking.findOneAndUpdate(
                    { _id: trackingId },
                    {
                        score: body.score,
                        reviewer: body.name,
                        completionAt: todayDate,
                        reviewerComment: body.reviewerComment,
                        $push: { correctedAt: todayDate },
                        ...queryStatus,
                    },
                    { new: true, upsert: true, omitUndefined: true }
                );

                if (queryStatus.lessonStatus === 'passed') {
                    for (let item of optionalItems) {
                        const foundItem = await Item.findById(item);
                        const trackingKind = processTrackingType(foundItem);
                        createCompleteTracking(foundItem, trackingKind, tracking.userLogin);
                    }
                    await GamificationKafka.publishEventRuleValidation({
                        events: [
                            EVENT_CATEGORY.ACHIEVED_PROGRESS_PERCENTAGE,
                            EVENT_CATEGORY.FINISHED_FAVORITE_TRAIL,
                            EVENT_CATEGORY.FINISHED_HIGHLIGHTED_ITEM,
                            EVENT_CATEGORY.FINISHED_ITEM,
                            EVENT_CATEGORY.FINISHED_OPTIONAL_ITEM,
                            EVENT_CATEGORY.FINISHED_OPTIONAL_TRAIL,
                            EVENT_CATEGORY.FINISHED_SECTION,
                            EVENT_CATEGORY.FINISHED_SHARED_TRAIL,
                            EVENT_CATEGORY.FINISHED_TRAIL,
                            EVENT_CATEGORY.STARTED_TRAIL,
                            EVENT_CATEGORY.WATCHED_COLLAB,
                        ],
                        identifier: tracking.userLogin,
                        meta: {
                            tracking: updatedTracking,
                        },
                    });
                }
            }

            _messages.success(res, req, 'Atividade atualizada com sucesso!');
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'updateActivityAdmin'
            );
        }
    },

    async updateActivityUser(req, res) {
        try {
            const { item, userLogin } = req.query;
            const todayDate = new Date();
            const tracking = await Tracking.findOne({
                item,
                userLogin,
                $or: [
                    { expiredCompletion: { $exists: false } },
                    { expiredCompletion: { $eq: null } },
                ],
            })
                .populate({
                    path: 'item',
                    populate: {
                        path: 'itemID',
                        model: 'Item',
                    },
                })
                .lean();

            const { file } = req.files;
            activityPath = await azureBlob(file, 'items/activity');

            if (tracking.lessonStatus == 'failed') {
                await ActivityTracking.findOneAndUpdate(
                    { _id: tracking._id },
                    {
                        lessonStatus: 'incomplete',
                        contentPath: activityPath,
                        $unset: { score: 1 },
                        $push: { sentAt: todayDate },
                    }
                );
            } else {
                await ActivityTracking.findOneAndUpdate(
                    { _id: tracking._id },
                    { contentPath: activityPath, $push: { sentAt: todayDate } }
                );
            }

            _messages.success(res, req, 'Atividade enviada com sucesso!');
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'updateActivityUser'
            );
        }
    },

    async registerViewPost(req, res) {
        try {
            const { _id } = req.body;
            const user = await getUserByToken(req);
            const trail = await Trail.findById(_id).populate({
                path: 'items.itemID',
                match: { kind: { $eq: 'PostItem' } },
            });
            const item = trail.items.find((item) => item.itemID)?.itemID;
            if (item) {
                createCompleteTracking(item, 'PostTracking', user.networkLogin);

                return _messages.success(res, req, 'Registrado com sucesso!');
            }

            return _messages.badRequest(
                res,
                req,
                'PostItem notfound',
                'PostItem notfound',
                'resgisterViewPost'
            );
        } catch (error) {
            console.error(error);
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'resgisterViewPost'
            );
        }
    },
};

function processTrackingType(item) {
    switch (item.kind) {
        case 'MediaItem':
            return 'MediaTracking';
        case 'DocumentItem':
            return 'DocumentTracking';
        case 'SCORMItem':
            return 'SCORMTracking';
        case 'ExamItem':
            return 'ExamTracking';
        case 'AudioItem':
            return 'AudioTracking';
        case 'EventItem':
            return 'EventTracking';
        case 'ActivityItem':
            return 'ActivityTracking';
        case 'FormItem':
            return 'FormTracking';
        default:
            break;
    }
}

function getSortableKey(activity, key, trails) {
    if (key === 'trails') {
        return (trails[activity.itemId] || []).join(', ').toLowerCase();
    }
    return activity[key]?.toLowerCase() || '';
}

module.exports = TrackingController;
