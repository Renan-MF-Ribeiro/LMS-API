require('dotenv').config();
const { DOMAIN, AZURE_BLOB_URL } = process.env;
const momentz = require('moment-timezone');
const moment = require('moment');
const path = require('path');
const httpStatus = require('http-status-codes');
const mongoose = require('mongoose');
const Busboy = require('busboy');
const unzipper = require('unzipper');
const etl = require('etl');
const { createWriteStream } = require('fs');
const parseXml = require('@rgrove/parse-xml');
const { filter, reduce, pipe } = require('ramda');
const { Trail } = require('../trails/model');
const { Section } = require('../sections/model');
const { error } = require('../../utils/logger');
const _errors = require('../../utils/errors');
const _messages = require('../../utils/messages');
const _functions = require('../../utils/functions');
const { HistoricEvaluation, Evaluation } = require('../assessments/model')
const { processExamTracking } = require('../tracking/business')
const {
    Item,
    DocumentItem,
    MediaItem,
    SCORMItem,
    ExamItem,
    AudioItem,
    SoundcloudItem,
    EventItem,
    ActivityItem,
    FormItem,
} = require('./model');
const { Tracking, SCORMLessonStatus } = require('../tracking/model');

const {
    azureBlob,
    isSCORMManifestFile,
    isSCORMSchemaFile,
    vimeoFilePathCreate,
    vimeoFilePathUpdate,
} = require('../../utils/files');

const {
    getTagsElegiblesByToken,
    checkEligibilityTagsAnd,
} = require('../sections/business');
const { getUserByToken } = require('../../utils/functions');
const GamificationController = require('../gamification/controller');
const { EVENTS_CATEGORY } = require('../gamification/model');
const { User } = require('../users/model');
const { handleSegmentationOnCreate, handleSegmentationOnQuery } = require('../config/business');
const ApiError = require('../../errors/ApiError');
const ITEM_KINDS = Object.freeze({
    DocumentItem: DocumentItem,
    MediaItem: MediaItem,
    SCORMItem: SCORMItem,
    ExamItem: ExamItem,
    AudioItem: AudioItem,
    SoundcloudItem: SoundcloudItem,
    EventItem: EventItem,
    ActivityItem: ActivityItem,
    FormItem: FormItem,
});

const ItemController = {
    async itemColaborativo (req, res) {
        let payload = {};
        if (req.fields.payload) {
            try {
                payload = JSON.parse(req.fields.payload);
            } catch { }
        }

        const flag = _functions.checksIfTheEndDateIsLessThanTheStartDate(
            payload.startDate,
            payload.endDate
        );
        if (!flag) {
            _messages.badRequest(
                res,
                req,
                'A data final não pode ser menor que a data inicial!',
                'A data final não pode ser menor que a data inicial!',
                'items',
                'multiUploadCreate'
            );
        } else {
            const user = await getUserByToken(req);

            const verify = await Item.find({
                title: { $eq: payload.title },
            });
            if (verify.length === 0) {
                const ItemModel =
                    ITEM_KINDS[req.body.kind || payload.kind] || Item;

                try {
                    const { thumb, content, banner } = req.files;
                    let thumbPath;
                    let contentPath;
                    let bannerPath;

                    if (thumb) {
                        thumbPath = await azureBlob(thumb, 'items/thumbs');
                    }

                    if (banner) {
                        bannerPath = await azureBlob(banner, 'items/banners');
                    }

                    if (
                        payload.kind !== 'MediaItem' ||
                        payload.kind != 'SoonItem'
                    ) {
                        if (content) {
                            payload.fileName = content.name;
                            contentPath = await azureBlob(
                                content,
                                'items/content'
                            );
                            contentPath =
                                process.env.NODE_ENV === 'local'
                                    ? contentPath
                                    : contentPath.replace(
                                        AZURE_BLOB_URL,
                                        DOMAIN
                                    );
                        }

                        if (
                            !contentPath &&
                            payload.content &&
                            (ItemModel === MediaItem || ItemModel === AudioItem)
                        ) {
                            contentPath = payload.content;
                            delete payload.content;
                        }
                    }

                    if (
                        (payload.kind !== 'SoundcloudItem' ||
                            payload.kind !== 'MediaItem') &&
                        payload.kind != 'SoonItem'
                    ) {
                        payload = {
                            ...payload,
                            enabled: true,
                            thumbPath: thumbPath || undefined,
                            bannerPath: bannerPath || undefined,
                            contentPath: contentPath || undefined,
                        };
                    } else if (payload.kind == 'SoonItem') {
                        payload = {
                            ...payload,
                            enabled: true,
                            thumbPath: thumbPath || undefined,
                        };
                    } else {
                        payload = {
                            ...payload,
                            enabled: true,
                            thumbPath: thumbPath || undefined,
                            bannerPath: bannerPath || undefined,
                        };
                    }

                    if (payload.kind === 'MediaItem') {
                        if (!content) {
                            // payload.contentPath = payload.content;
                        } else {
                            payload.enabled = true;
                            payload.contentPath = String(
                                new Date().toISOString()
                            );
                            vimeoFilePathCreate(content, payload, user);
                        }
                    }

                    if (payload.kind === 'EventItem') {
                        delete payload.contentPath;
                    }

                    const sectionId = payload.sectionId;

                    delete payload.thumb;
                    delete payload.content;
                    delete payload.tags;
                    delete payload.sectionId;

                    payload.author = user._id;

                    const item = await ItemModel.create(payload);

                    if (item._id) {
                        const trail = await Trail.create({
                            backgroundPath: null,
                            bannerPath: null,
                            completion: null,
                            description: item.description,
                            enabled: true,
                            endDate: item.endDate,
                            highlighted: false,
                            isSequenceEnabled: 'NONE',
                            items: [
                                {
                                    itemID: item._id,
                                    urlItem: item._item,
                                    urlTrail: item._,
                                    mandatory: false,
                                },
                            ],
                            items_new: [],
                            mandatory: [],
                            startDate: item.startDate,
                            tags: [
                                {
                                    display: 'ELEGE_geral',
                                    value: 'ELEGE_geral',
                                },
                            ],
                            collaborative: item.collaborative,
                            author: item.author,
                            moderation: user.groupsAD.includes(
                                'PERFIL_Colaborador_Livre'
                            )
                                ? 'approved'
                                : 'pending',
                            thumbPath: thumbPath,
                            title: item.title,
                            titleURL: item.titleURL,
                        });

                        await Section.findOneAndUpdate(
                            { _id: sectionId },
                            {
                                $push: {
                                    trails: {
                                        _id: trail._id,
                                    },
                                },
                            }
                        );
                    }

                    // GAMIFICATION DISPATCH
                    const collabItems = await Item.find({
                        author: user._id,
                        collaborative: true,
                    });
                    await GamificationController.dispatch(
                        user.networkLogin,
                        [EVENTS_CATEGORY.UPLOADED_CONTENT],
                        {
                            collabItemsCreatedAt: collabItems.map(
                                ({ createdAt }) => createdAt
                            ),
                        }
                    );

                    //Evento novo conteúdo colaborativo
                    _messages.success(res, req, item._id);
                } catch (error) {
                    if (error.message === 'Something went wrong') {
                        _messages.internalServer(
                            res,
                            req,
                            error.error,
                            error,
                            'itemColaborativo'
                        );
                    }

                    if (error.name === 'ValidationError') {
                        const messages = {};
                        for (const k in error.errors)
                            messages[k] = error.errors[k].message;
                        _messages.badRequest(
                            res,
                            req,
                            error,
                            { name: error.name, messages },
                            'items',
                            'itemColaborativo'
                        );
                    } else {
                        _messages.internalServer(
                            res,
                            req,
                            error.message,
                            'Erro interno no servidor',
                            'items',
                            'itemColaborativo'
                        );
                    }
                }
            } else {
                _messages.badRequest(
                    res,
                    req,
                    'Já existe um item com esse título!',
                    'Já existe um item com esse título!',
                    'items',
                    'itemColaborativo'
                );
            }
        }
    },

    async create (req, res) {
        const ItemModel = ITEM_KINDS[req.body.kind] || Item;

        try {

            if (req?.segmentation) {
                await handleSegmentationOnCreate(req)
            }

            const { _id } = await ItemModel.create(req.body);

            _messages.success(res, req, { _id });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'items',
                'create'
            );
        }
    },

    async multiUploadCreate (req, res) {
        let payload = {};
        if (req.fields.payload) {
            try {
                payload = JSON.parse(req.fields.payload);
            } catch { }
        }

        const flag = _functions.checksIfTheEndDateIsLessThanTheStartDate(
            payload.startDate,
            payload.endDate
        );
        if (!flag) {
            _messages.badRequest(
                res,
                req,
                'A data final não pode ser menor que a data inicial!',
                'A data final não pode ser menor que a data inicial!',
                'items',
                'multiUploadCreate'
            );
        } else {
            const user = await getUserByToken(req);

            const verify = await Item.find({
                $or: [{
                    title: { $eq: payload.title },
                    _id: { $ne: payload._id },
                }, {
                    _id: { $ne: payload._id },
                    titleURL: { $regex: payload.titleURL, $options: 'i' }
                }]
            });
            if (verify.length > 0) {
                const titleDuplicate = verify.some((item) => item.title === payload.title)
                const titleURLDuplicate = verify.some((item) => item.titleURL === payload.titleURL)
                if (titleURLDuplicate) payload.titleURL = `${payload.titleURL}-${verify.length}`

                if (titleDuplicate) {
                    return _messages.badRequest(
                        res,
                        req,
                        'Já existe um item com esse título!',
                        'Já existe um item com esse título!',
                        'items',
                        'update'
                    );
                }
            }

            const ItemModel =
                ITEM_KINDS[req.body.kind || payload.kind] || Item;

            try {
                const { thumb, content, banner } = req.files;
                let thumbPath;
                let contentPath;
                let bannerPath;

                if (thumb) {
                    thumbPath = await azureBlob(thumb, 'items/thumbs');
                }

                if (banner) {
                    bannerPath = await azureBlob(banner, 'items/banners');
                }

                if (
                    payload.kind !== 'MediaItem' ||
                    payload.kind != 'SoonItem'
                ) {
                    if (content) {
                        payload.fileName = content.name;
                        contentPath = await azureBlob(
                            content,
                            'items/content'
                        );
                        contentPath =
                            process.env.NODE_ENV === 'local'
                                ? contentPath
                                : contentPath.replace(
                                    AZURE_BLOB_URL,
                                    DOMAIN
                                );
                    }

                    if (
                        !contentPath &&
                        payload.content &&
                        (ItemModel === MediaItem || ItemModel === AudioItem)
                    ) {
                        contentPath = payload.content;
                        delete payload.content;
                    }
                }

                if (
                    (payload.kind !== 'SoundcloudItem' ||
                        payload.kind !== 'MediaItem') &&
                    payload.kind != 'SoonItem'
                ) {
                    payload = {
                        ...payload,
                        enabled: true,
                        thumbPath: thumbPath || undefined,
                        bannerPath: bannerPath || undefined,
                        contentPath: contentPath || undefined,
                    };
                } else if (payload.kind == 'SoonItem') {
                    payload = {
                        ...payload,
                        enabled: true,
                        thumbPath: thumbPath || undefined,
                    };
                } else {
                    payload = {
                        ...payload,
                        enabled: true,
                        thumbPath: thumbPath || undefined,
                        bannerPath: bannerPath || undefined,
                    };
                }

                if (payload.kind === 'MediaItem') {
                    if (!content) {
                        // payload.contentPath = payload.content;
                    } else {
                        payload.enabled = true;
                        payload.contentPath = String(
                            new Date().toISOString()
                        );
                        vimeoFilePathCreate(content, payload, user);
                    }
                }

                if (payload.kind === 'EventItem') {
                    delete payload.contentPath;
                }

                if (payload.kind === 'FormItem') {
                    delete payload.contentPath;
                    payload.statements = payload.statements.map(
                        (statement) => ({
                            _id: new mongoose.Types.ObjectId(),
                            title: statement.title,
                            type: statement.type,
                            alternatives: statement?.alternatives?.map(
                                ({ alternative }) => ({
                                    _id: new mongoose.Types.ObjectId(),
                                    alternative,
                                })
                            ),
                            numberCharacters: statement?.numberCharacters,
                        })
                    );
                }

                delete payload.thumb;
                delete payload.banner;
                delete payload.content;
                payload.author = user._id;

                if (req?.segmentation) {
                    await handleSegmentationOnCreate(req, payload)
                }

                const item = await ItemModel.create(payload);
                _messages.success(res, req, item);
            } catch (error) {
                console.log(error)
                if (error.name === 'ValidationError') {
                    const messages = {};
                    for (const k in error.errors)
                        messages[k] = error.errors[k].message;
                    _messages.badRequest(
                        res,
                        req,
                        error,
                        { name: error.name, messages },
                        'items',
                        'multiUploadCreate'
                    );
                } else {
                    _messages.internalServer(
                        res,
                        req,
                        error.message,
                        'Erro interno no servidor',
                        'items',
                        'multiUploadCreate'
                    );
                }
            }

        }
    },

    async update (req, res) {
        let payload = {};
        if (req.fields.payload) {
            try {
                payload = JSON.parse(req.fields.payload);
            } catch { }
        }

        const flag = _functions.checksIfTheEndDateIsLessThanTheStartDate(
            payload.startDate,
            payload.endDate
        );
        if (!flag) {
            _messages.badRequest(
                res,
                req,
                'A data final não pode ser menor que a data inicial!',
                'A data final não pode ser menor que a data inicial!',
                'items',
                'multiUploadCreate'
            );
        } else {
            const user = await getUserByToken(req);

            const verify = await Item.find({
                $or: [{
                    title: { $eq: payload.title },
                    _id: { $ne: payload._id },
                }, {
                    _id: { $ne: payload._id },
                    titleURL: { $regex: payload.titleURL, $options: 'i' }
                }]
            });
            if (verify.length > 0) {
                const titleDuplicate = verify.some((item) => item.title === payload.title)
                const titleURLDuplicate = verify.some((item) => item.titleURL === payload.titleURL)
                if (titleURLDuplicate) payload.titleURL = `${payload.titleURL}-${verify.length}`
                if (titleDuplicate) {
                    return _messages.badRequest(
                        res,
                        req,
                        'Já existe um item com esse título!',
                        'Já existe um item com esse título!',
                        'items',
                        'update'
                    );
                }
            }

            const ItemModel =
                ITEM_KINDS[req.body.kind || payload.kind] || Item;
            try {
                const content = req.files.content;
                const thumb = req.files.thumb;
                const banner = req.files.banner;

                let thumbPath;
                let thumbPath2;
                let contentPath;
                let bannerPath;

                if (thumb) {
                    thumbPath = await azureBlob(thumb, 'items/thumbs');
                }

                if (banner) {
                    bannerPath = await azureBlob(banner, 'items/banners');
                }

                if (payload.kind !== 'MediaItem') {
                    if (content) {
                        payload.fileName = content.name;
                        contentPath = await azureBlob(
                            content,
                            'items/content'
                        );
                        contentPath =
                            process.env.NODE_ENV === 'local'
                                ? contentPath
                                : contentPath.replace(
                                    AZURE_BLOB_URL,
                                    DOMAIN
                                );
                    }
                }

                if (
                    !contentPath &&
                    payload.content &&
                    ItemModel === MediaItem
                ) {
                    contentPath = payload.content;
                    delete payload.content;
                }

                if (payload.kind === 'MediaItem') {
                    if (content) {
                        payload.enabled = true;
                        const item = await Item.findOne({
                            _id: payload._id,
                        });
                        const vimeoId = item.vimeoId;
                        payload.contentPath = String(
                            new Date().toISOString()
                        );
                        if (payload.vimeoId) {
                            vimeoFilePathUpdate(
                                content,
                                payload,
                                user,
                                vimeoId
                            );
                        } else {
                            vimeoFilePathCreate(content, payload, user);
                        }
                    }
                }

                payload = {
                    ...(thumbPath ? { thumbPath: thumbPath } : {}),
                    ...(contentPath ? { contentPath: contentPath } : {}),
                    ...(bannerPath ? { bannerPath: bannerPath } : {}),
                    ...payload,
                };

                if (payload.kind === 'FormItem') {
                    for (let i = 0; i < payload?.statements.length; i++) {
                        const statement = payload?.statements[i];
                        payload.statements[i] = {
                            _id:
                                statement?._id ||
                                new mongoose.Types.ObjectId(),
                            title: statement.title,
                            type: statement.type,
                            ...(statement?.alternatives && {
                                alternatives: statement.alternatives.map(
                                    ({ _id, alternative }) => ({
                                        _id:
                                            _id ||
                                            new mongoose.Types.ObjectId(),
                                        alternative,
                                    })
                                ),
                            }),
                            ...(statement?.numberCharacters && {
                                numberCharacters:
                                    statement?.numberCharacters,
                            }),
                        };
                    }
                }

                delete payload.content;
                delete payload.thumb;
                delete payload.banner;
                delete payload.sectionId;

                payload.author = user._id;

                let item = await Item.findById({ _id: payload._id });
                if (item.kind == 'SoonItem' && item.kind != payload.kind) {
                    await Item.findOneAndUpdate(
                        { _id: item._id },
                        {
                            kind: payload.kind,
                        }
                    );
                }

                if (payload.kind === 'SCORMItem' && content) {
                    const { contentPath } = await ItemModel.findById(
                        payload._id
                    );

                    await ItemModel.findByIdAndUpdate(payload._id, payload);
                    item = await ItemModel.findByIdAndUpdate(payload._id, {
                        contentPath,
                    }, { new: true });
                } else {
                    item = await ItemModel.findByIdAndUpdate(payload._id, payload, { new: true });
                }

                _messages.success(res, req, item);
            } catch (error) {
                console.log(error)
                if (error instanceof ApiError) {
                    return _messages.badRequest(
                        res,
                        req,
                        error.message,
                        error.message,
                        'items',
                        'update'
                    );
                };

                if (error.name === 'ValidationError') {
                    const messages = {};
                    for (const k in error.errors)
                        messages[k] = error.errors[k].message;
                    _messages.badRequest(
                        res,
                        req,
                        error,
                        { name: error.name, messages },
                        'items',
                        'update'
                    );
                } else {
                    _messages.internalServer(
                        res,
                        req,
                        error.message,
                        'Erro interno no servidor',
                        'items',
                        'update'
                    );
                }
            }

        }
    },

    async updateById (req, res) {
        const ItemModel = ITEM_KINDS[req.body.kind] || Item;

        try {
            const _id = req.params.itemId;
            await ItemModel.findOneAndUpdate({ _id }, req.body);
            res.status(httpStatus.NO_CONTENT).send();
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'items',
                'updateById'
            );
        }
    },

    async updateStatus (req, res) {
        try {
            const { _id, enabled } = req.body;
            const item = await Item.findOne({ _id });

            if (
                (item.title && item.description && item.durationHours) ||
                item.kind === 'SoonItem'
            ) {
                await Item.findByIdAndUpdate(_id, { enabled });
                _messages.success(res, req, 'Atualizado com sucesso');
            } else {
                _messages.badRequest(
                    res,
                    req,
                    'Por favor, preencha os campos obrigatórios antes de ativar o item',
                    'Por favor, preencha os campos obrigatórios antes de ativar o item'
                );
            }
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'items',
                'updateById'
            );
        }
    },

    async findItemTrails (req, res) {
        try {
            const _id = req.params.itemId;
            const trails = await Trail.find(
                { 'items.itemID': { $in: _id } },
                'title'
            );
            _messages.success(res, req, trails);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'items',
                'fintItemTrails'
            );
        }
    },

    async disableById (req, res) {
        ItemController.updateById({ ...req, body: { enabled: false } }, res);
    },

    async findById (req, res) {
        try {
            const findValue = req.params.itemId;

            const isObjectId = mongoose.Types.ObjectId.isValid(findValue);

            const query = {
                $and: [{
                    [isObjectId ? '_id' : 'titleURL']: findValue
                }]
            }

            if (req?.segmentation) {
                handleSegmentationOnQuery(req, 'owner', query)
            }

            const item = await Item.findOne(query);

            _messages.success(res, req, item);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'items',
                'findById'
            );
        }
    },

    async findItemById (req, res) {
        try {
            const findItemValue = req.params.itemId;
            const findITrailValue = req.params.trailId;
            const userId = _functions.getUserByToken(req);

            const queryItem = findItemValue.match(/^[0-9a-fA-F]{24}$/)
                ? {
                    $or: [
                        { _id: findItemValue, archive: { $ne: true } },
                        { titleURL: findItemValue },
                    ],
                }
                : { titleURL: findItemValue, archive: { $ne: true } };

            const queryTrail = findITrailValue.match(/^[0-9a-fA-F]{24}$/)
                ? {
                    $or: [
                        { _id: findITrailValue },
                        { titleURL: findITrailValue },
                    ],
                }
                : { titleURL: findITrailValue };

            const tags = await getTagsElegiblesByToken(req);
            const trail = await Trail.findOne(queryTrail);
            if (!checkEligibilityTagsAnd(tags, trail.tagsAnd, trail.tags)) {
                _messages.badRequest(
                    res,
                    req,
                    'Você não esta elegível a este conteúdo',
                    'Você não esta elegível a este conteúdo',
                    'items',
                    'findItemById'
                );
                return;
            }

            const item = await Item.findOne(queryItem);

            const isEnabled = item.deleted == 0 && item.enabled && !item.archive
            if (!isEnabled) {
                _messages.success(res, req, {
                    error: true,
                    message: 'Curso desabilitado ou removido',
                });
                return;
            }

            const today = momentz();
            const startDate = momentz(trail.startDate);
            const endDate = momentz(trail.endDate);

            const isDateValid =
                today.diff(startDate, 'days') >= 0 &&
                today.diff(endDate, 'days') <= 0;

            if (!isDateValid) {
                _messages.success(res, req, {
                    error: true,
                    message: 'Curso ainda não começou ou está vencido',
                });
                return;
            }
            _messages.success(res, req, {
                ...item._doc,
                trailTitle: trail.title,
                confidential: trail.confidential
            });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'items',
                'findItemById'
            );
        }
    },

    async createDocument (req, res) {
        req.body.kind = 'DocumentItem';
        ItemController.create(req, res);
    },

    async multiUploadDocument (req, res) {
        req.body.kind = 'DocumentItem';
        ItemController.multiUploadCreate(req, res);
    },

    async createMedia (req, res) {
        req.body.kind = 'MediaItem';
        ItemController.create(req, res);
    },

    async multiUploadMedia (req, res) {
        req.body.kind = 'MediaItem';
        ItemController.multiUploadCreate(req, res);
    },

    async uploadSCORM (req, res) {
        const user = await getUserByToken(req);
        if (req.method !== 'POST') {
            return res.status(httpStatus.NOT_FOUND).send();
        }

        if (!req.is('multipart/form-data')) {
            return res.status(httpStatus.NOT_ACCEPTABLE).send();
        }

        try {
            const packageId = new mongoose.Types.ObjectId();
            let _id = null;
            const busboy = new Busboy({
                headers: req.headers,
                limits: {
                    fields: 1,
                    files: 1,
                },
            });

            let manifestP = null;
            const filesP = [];
            let pathFile = null;
            let scormName = null;
            const contentP = new Promise((resolve, reject) => {
                busboy
                    .on(
                        'file',
                        function (field, file, filename, encoding, mimetype) {
                            if (field !== 'content') return;

                            file.path = filename;
                            pathFile = azureBlob(
                                file,
                                `scorm/${packageId}`,
                                true
                            );
                            scormName = filename;

                            file.pipe(unzipper.Parse())
                                .on('error', function (err) {
                                    error('unzipper error: %s', err);

                                    if (
                                        /invalid\s+signature/i.test(err.message)
                                    ) {
                                        reject(
                                            _errors.SCORM_UPLOAD.INVALID_PACKAGE
                                        );
                                    } else {
                                        reject(err);
                                    }
                                })
                                .on('finish', resolve)
                                .pipe(
                                    etl.map(async (entry) => {
                                        if (
                                            isSCORMSchemaFile(entry.path) ||
                                            entry.type === 'Directory'
                                        ) {
                                            filesP.push(
                                                entry.autodrain().promise()
                                            );
                                            return;
                                        }

                                        if (
                                            !entry.path.includes('/') &&
                                            isSCORMManifestFile(entry.path)
                                        ) {
                                            manifestP = entry.buffer();
                                            return;
                                        }

                                        filesP.push(
                                            azureBlob(
                                                entry,
                                                `scorm/${packageId}`
                                            )
                                        );
                                    })
                                );
                        }
                    )
                    .on('error', reject);
            });
            req.pipe(busboy);
            const fieldP = new Promise((resolve, reject) => {
                busboy
                    .on('field', function (field, id) {
                        _id = id;
                        return;
                    })
                    .on('finish', resolve)
                    .on('error', reject);
            });

            await Promise.all([...filesP, fieldP, contentP]);
            let path = await pathFile;
            path = path.replace(AZURE_BLOB_URL, DOMAIN);
            const scormPath = {
                path: path,
                name: scormName,
            };

            if (!manifestP) {
                throw _errors.SCORM_UPLOAD.NO_MANIFEST;
            }

            try {
                const manifest = (await manifestP).toString();
                const $doc = parseXml(manifest);
                const $manifest = $doc.children[0];
                const $orgs = $manifest.children.find(
                    (el) => el.name === 'organizations'
                );
                if (!$orgs) return _messages.success(res, req, []);

                const defaultOrg = $orgs.attributes.default;
                if (!defaultOrg) return _messages.success(res, req, []);

                const $org = $orgs.children.find(
                    (el) =>
                        el.name === 'organization' &&
                        el.attributes.identifier === defaultOrg
                );

                if (!$org) return _messages.success(res, req, []);

                const itemReducer = pipe(
                    filter((el) => el.type === 'element' && el.name === 'item'),
                    reduce(
                        (items, item) => [
                            ...items,
                            item,
                            ...itemReducer(item.children),
                        ],
                        []
                    )
                );

                const $items = itemReducer($org.children);
                if (!$items.length) return _messages.success(res, req, []);

                const $resources = $manifest.children.find(
                    (el) => el.name === 'resources'
                );

                if (_id) {
                    const item = await Item.findById({ _id: _id });
                    if (item.kind == 'SoonItem') {
                        await Item.findOneAndUpdate(
                            { _id: item._id },
                            {
                                kind: 'SCORMItem',
                            }
                        );
                    }
                }

                const items = await Promise.all(
                    $items.map(($item) => {
                        const $resource = $resources.children.find(
                            (el) =>
                                el.name === 'resource' &&
                                el.attributes.identifier ===
                                $item.attributes.identifierref
                        );
                        const $title = $item.children.find(
                            (el) => el.name === 'title'
                        );

                        const title = $title && $title.children[0].text;
                        const titleURL = title.toLowerCase();
                        const href = $resource.attributes.href;
                        const scoId = $item.attributes.identifier;

                        if (_id) {
                            return SCORMItem.findByIdAndUpdate(_id, {
                                enabled: false,
                                packageId,
                                scoId,
                                contentPath: `${packageId}/${href}`,
                                scormPath,
                            });
                        } else {
                            return SCORMItem.create({
                                author: user._id,
                                title,
                                titleURL,
                                packageId,
                                scoId,
                                contentPath: `${packageId}/${href}`,
                                scormPath,
                            });
                        }
                    })
                );

                _messages.success(res, req, items);
            } catch (err) {
                throw _errors.SCORM_UPLOAD.INVALID_MANIFEST;
            }
        } catch (err) {
            if (err.code === _errors.SCORM_UPLOAD.INVALID_PACKAGE.code) {
                res.status(httpStatus.UNPROCESSABLE_ENTITY).send(err);
            } else {
                _messages.badRequest(
                    res,
                    req,
                    err,
                    { code: err.code, message: err.message },
                    'Bad Request',
                    'items',
                    'uploadSCORM'
                );
            }
        }
    },

    async updateSCORM (req, res) {

        if (req.method !== 'PUT') {
            return res.status(httpStatus.NOT_FOUND).send();
        }

        if (!req.is('multipart/form-data')) {
            return res.status(httpStatus.NOT_ACCEPTABLE).send();
        }

        try {
            const _id = req.params.itemId;
            let { packageId } = await Item.findOne({ _id }, 'packageId');
            const { contentPath, scoId } = await SCORMItem.findOne(
                { _id },
                'contentPath scoId'
            );
            const contentPathExplode = contentPath.split('/');
            const explodeUrl = contentPathExplode[0].split('_');

            contentPathExplode.shift();
            // const href = contentPathExplode.join('/');

            if (!explodeUrl[1]) {
                packageId = packageId + '_1';
            } else {
                const version = parseInt(explodeUrl[1]) + 1;
                packageId = packageId + `_${version}`;
            }

            const busboy = new Busboy({
                headers: req.headers,
                limits: {
                    fields: 0,
                    files: 1,
                },
            });

            let manifestP = null;
            const filesP = [];
            let pathFile = null;
            let scormName = null;
            const contentP = new Promise((resolve, reject) => {
                busboy
                    .on(
                        'file',
                        function (field, file, filename, encoding, mimetype) {
                            if (field !== 'content') return;

                            file.path = filename;
                            pathFile = azureBlob(
                                file,
                                `scorm/${packageId}`,
                                true
                            );
                            scormName = filename;

                            file.pipe(unzipper.Parse())
                                .on('error', function (err) {
                                    error('unzipper error: %s', err);

                                    if (
                                        /invalid\s+signature/i.test(err.message)
                                    ) {
                                        reject(
                                            _errors.SCORM_UPLOAD.INVALID_PACKAGE
                                        );
                                    } else {
                                        reject(err);
                                    }
                                })
                                .on('finish', resolve)
                                .pipe(
                                    etl.map(async (entry) => {
                                        if (
                                            isSCORMSchemaFile(entry.path) ||
                                            entry.type === 'Directory'
                                        ) {
                                            filesP.push(
                                                entry.autodrain().promise()
                                            );

                                            return;
                                        }

                                        if (
                                            !entry.path.includes('/') &&
                                            isSCORMManifestFile(entry.path)
                                        ) {
                                            manifestP = entry.buffer();
                                            return;
                                        }

                                        filesP.push(
                                            azureBlob(
                                                entry,
                                                `scorm/${packageId}`
                                            )
                                        );
                                    })
                                );
                        }
                    )
                    .on('error', reject);
            });
            req.pipe(busboy);
            await Promise.all([...filesP, contentP]);
            let path = await pathFile;
            path = path.replace(AZURE_BLOB_URL, DOMAIN);
            const scormPath = {
                path: path,
                name: scormName,
            };

            if (!manifestP) {
                throw _errors.SCORM_UPLOAD.NO_MANIFEST;
            }

            try {
                const manifest = (await manifestP).toString();
                const $doc = parseXml(manifest);
                const $manifest = $doc.children[0];
                const $orgs = $manifest.children.find(
                    (el) => el.name === 'organizations'
                );
                if (!$orgs) return _messages.success(res, req, []);
                const defaultOrg = $orgs.attributes.default;
                if (!defaultOrg) return _messages.success(res, req, []);

                const $org = $orgs.children.find(
                    (el) =>
                        el.name === 'organization' &&
                        el.attributes.identifier === defaultOrg
                );

                if (!$org) return _messages.success(res, req, []);

                const itemReducer = pipe(
                    filter((el) => el.type === 'element' && el.name === 'item'),
                    reduce(
                        (items, item) => [
                            ...items,
                            item,
                            ...itemReducer(item.children),
                        ],
                        []
                    )
                );

                const $items = itemReducer($org.children);
                if (!$items.length) return _messages.success(res, req, []);

                const $resources = $manifest.children.find(
                    (el) => el.name === 'resources'
                );

                const items = await Promise.all(
                    $items.map(($item) => {
                        const $resource = $resources.children.find(
                            (el) =>
                                el.name === 'resource' &&
                                el.attributes.identifier ===
                                $item.attributes.identifierref
                        );

                        const href = $resource.attributes.href;
                        const scoIdentifier = $item.attributes.identifier;
                        if (scoId != scoIdentifier) {
                            throw _errors.SCORM_UPLOAD.UNEXPECTED_IDENTIFIER;
                        }

                        return SCORMItem.findByIdAndUpdate(_id, {
                            contentPath: `${packageId}/${href}`,
                            scormPath: scormPath,
                        });
                    })
                );

                return _messages.success(res, req, items);
            } catch (err) {
                if (err) {
                    throw _errors.SCORM_UPLOAD.UNEXPECTED_IDENTIFIER;
                }
                throw _errors.SCORM_UPLOAD.INVALID_MANIFEST;
            }
        } catch (err) {
            if (err.code === _errors.SCORM_UPLOAD.INVALID_PACKAGE.code) {
                res.status(httpStatus.UNPROCESSABLE_ENTITY).send(err);
            } else {
                _messages.badRequest(
                    res,
                    req,
                    err,
                    { code: err.code, message: err.message },
                    'Bad Request',
                    'items',
                    'updateSCORM'
                );
            }
        }
    },

    async findAll (req, res) {
        try {
            const { skip, limit } = _functions.pagination(req);
            const { sort, order } = _functions.ordernation(req);

            const q = {};
            if (req.query.enabled !== undefined) q.enabled = true;
            const searchBy = req.query.searchBy;
            const archive = req.query.archive;
            const collaborative = req.query.collaborative;
            const query = searchBy
                ? {
                    $or: [
                        {
                            description: {
                                $regex: searchBy,
                                $options: 'i',
                            },
                        },
                        { title: { $regex: searchBy, $options: 'i' } },
                        { notes: { $regex: searchBy, $options: 'i' } },
                        { alias: { $regex: searchBy, $options: 'i' } },
                        { keywords: { $regex: searchBy, $options: 'i' } },
                        {
                            responsible: {
                                $regex: searchBy,
                                $options: 'i',
                            },
                        },
                    ],
                    deleted: { $eq: 0 },
                }
                : {
                    deleted: { $eq: 0 },
                }

            query['archive'] = archive ? { $eq: archive === 'true' } : { $ne: true };
            query['kind'] = { $nin: ['PostItem', 'AluraItem'] };
            query['collaborative'] = collaborative ? { $eq: collaborative === 'true' } : { $ne: true };

            if (req?.segmentation) {
                handleSegmentationOnQuery(req, 'owner', query)
            }

            let total = await Item.find(query).count();

            let itens = await Item.find(query)
                .populate('idEvaluation', ['description', 'duration'])
                .skip(parseInt(skip))
                .limit(parseInt(limit))
                .sort({ [order]: sort });

            if (req.query.activityItemFilter === 'true') {
                const dataItens = [];
                const filterItens = await Item.find(query);

                await Promise.all(
                    filterItens.reverse().map(async (item) => {
                        if (item.kind != 'ActivityItem') {
                            dataItens.push(item);
                        }
                    })
                );

                total = dataItens.length;
                itens = dataItens
                    .slice(parseInt(skip))
                    .slice(0, parseInt(limit));
            }
            if (req.query.filterNotRelated === 'true') {
                const dataItens = [];
                const filterItens = await Item.find(query);

                await Promise.all(
                    filterItens.map(async (item) => {
                        const trail = await Trail.find({
                            'items.itemID': { $in: item._id },
                        }).countDocuments();

                        if (req.query.activityItemFilter === 'true') {
                            if (item.kind != 'ActivityItem') {
                                if (trail === 0) dataItens.push(item);
                            }
                        } else {
                            if (trail === 0) dataItens.push(item);
                        }
                    })
                );
                total = dataItens.length;
                itens = dataItens
                    .reverse()
                    .slice(parseInt(skip))
                    .slice(0, parseInt(limit));
            }

            _messages.success(res, req, {
                data: itens,
                total,
            });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'items',
                'findAll'
            );
        }
    },

    async findItensActives (req, res) {
        try {
            const itens = await Item.find({
                enabled: { $eq: true },
                deleted: { $eq: 0 },
            });
            _messages.success(res, req, itens);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'items',
                'findItensActives'
            );
        }
    },

    async generateCertificate (req, res) {
        try {
            const { item } = req.params;
            const user = await _functions.getUserByToken(req);
            const course = await Item.findById(item);
            const tracking = await Tracking.findOne({
                item: { $eq: item },
                userLogin: user.networkLogin,
            });

            if (tracking.completion === 1) {
                const certificate = {
                    name: user.name,
                    course: course.title,
                    date: _functions.getDateTodayExtensive(),
                    workload: _functions.convertMinutesToHours(
                        course.durationHours
                    ),
                };
                _messages.success(res, req, certificate);
            } else {
                _messages.badRequest(
                    res,
                    req,
                    'Não foi possível gerar o certificado, pois o item não está concluído!',
                    'Conclua o item para gerar o certificado!',
                    'items',
                    'generateCertificate'
                );
            }
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'items',
                'generateCertificate'
            );
        }
    },

    async getItemWithTracking (req, res) {
        try {
            const { itemId } = req.params;
            const user = await getUserByToken(req);
            const item = await Item.findById(itemId);
            let tracking = await Tracking.findOne({
                item: item._id,
                userLogin: user.networkLogin,
                $or: [
                    { expiredCompletion: { $exists: false } },
                    { expiredCompletion: { $eq: null } }
                ]
            });

            if (tracking?.kind == 'ExamTracking') {

                const historicEvaluations = await HistoricEvaluation.find({
                    idEvaluation: item.idEvaluation,
                    user: user._id,
                    lessonStatus: { $eq: SCORMLessonStatus.NOT_ATTEMPTED }
                }).sort({ createdAt: 'desc' }).limit(1)

                if (historicEvaluations.length) {

                    const historic = historicEvaluations[0]

                    if (historic.amountQuestionsAnswered >= historic.amountOfQuestions) {
                        const { attempts } = await Evaluation.findOne({
                            _id: item.idEvaluation,
                        });

                        const processed = await processExamTracking(historic, item.passingScore, attempts, tracking)

                        tracking = { ...tracking._doc, ...processed }
                    }
                }
            }


            _messages.success(res, req, { item, tracking });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'items',
                'getItemWithTracking'
            );
        }
    },

    async getProviders (req, res) {
        try {
            const items = await Item.find({});
            const providers = items
                .filter((item) => item.provider)
                .map((item) => item.provider);

            const uniqueProviders = [...new Set(providers)];

            _messages.success(res, req, uniqueProviders);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor'
            );
        }
    },

    async archive (req, res) {
        const itemId = req.params.itemId;

        await Item.findByIdAndUpdate(itemId, { $set: { enabled: false, archive: true, archivedAt: new Date() } });

        res.status(204).send();
    },

    async unarchive (req, res) {
        const itemId = req.params.itemId;

        await Item.findByIdAndUpdate(itemId, { $set: { archive: false, archivedAt: null } });

        res.status(204).send();
    }
};

module.exports = ItemController;
