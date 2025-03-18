require('dotenv').config();
const { TINCAN_OWNER, DOMAIN, AZURE_BLOB_URL } = process.env;
const _messages = require('../../utils/messages');
const { azureBlob } = require('../../utils/files');
const {
    isSCORMCompleted,
    processExpirationDate,
    processTrailTracking,
} = require('../../utils/functions');
const { Trail } = require('./model');
const { Item, PostItem } = require('../items/model');
const { populateTrails } = require('../trails/business');
const { Tracking } = require('../tracking/model');
const { updateProgressAluraItem } = require('../tracking/business');
const {
    pagination,
    ordernation,
    getUserByToken,
    getTagsGroupsByToken,
    checksIfTheEndDateIsLessThanTheStartDate,
    getDateTodayWithoutHours,
    formatDateWithoutHours,
} = require('../../utils/functions');
const { CourseModel } = require('../courses/model')
const { dispatch } = require('../webhooks/controller');

const { Log } = require('../logs/model');
const mongoose = require('mongoose');

const { checkItem, processTrailWorkload } = require('./business');

const { Evaluation } = require('../assessments/model');
const { User } = require('../users/model');
const { sendMessageToKafka, processTargetUsers } = require('../new-messages/business');

const {
    elegiblesContents,
    keepLearningSections,
    concludedSections,
    checkEligibilityTagsAnd,
    getTagsElegiblesByToken,
} = require('../sections/business');

const { updateCertificateExpirationDate } = require('../certificates/business');
const { createItemIfAlura } = require('../items/business');
const { handleSegmentationOnCreate, handleSegmentationOnQuery } = require('../config/business');

const ObjectId = require("mongoose").Types.ObjectId;

const GamificationKafka = require('../gamification/kafka/broker');
const { EVENT_CATEGORY } = require('../gamification/model');

module.exports = {
    async getCollaborative (req, res) {
        try {
            const queryParams = req.query;

            const { skip, limit } = pagination(req);
            const searchObj = { collaborative: true, ...queryParams };

            if (req?.segmentation) {
                handleSegmentationOnQuery(req, 'owner', searchObj)
            }

            const total = await Trail.countDocuments(searchObj);

            const trails = await populateTrails(
                true,
                searchObj,
                { createdAt: -1 },
                skip,
                limit
            );

            _messages.success(res, req, { trails, total });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'trails',
                'getColaborativo'
            );
        }
    },

    async getCollaborativeChannel (req, res) {
        try {
            const user = await getUserByToken(req);
            const { skip, limit } = pagination(req);
            const searchObj = {
                collaborative: true,
                $or: [{ moderation: 'approved' }, { moderation: 'denounced' }],
                enabled: true,
            };

            if (req?.segmentation) {
                handleSegmentationOnQuery(req, 'owner', searchObj)
            }

            const total = await Trail.countDocuments(searchObj);

            const trails = await populateTrails(
                true,
                searchObj,
                { createdAt: -1 },
                skip,
                limit
            );

            const filteredTrails = trails.filter(
                (trail) => trail.complaints.length <= 5
            );

            const allTrackingUser = await Tracking.find({
                userLogin: { $eq: user.networkLogin },
                $or: [
                    { expiredCompletion: { $exists: false } },
                    { expiredCompletion: { $eq: null } },
                ],
            });

            for (let trail of filteredTrails) {
                const processedTrail = processTrailTracking(
                    trail,
                    allTrackingUser
                );

                if (trail.expirationType) {
                    trail = processExpirationDate(trail, user);
                }

                trail = processedTrail.trail;
            }

            const arrSections = await elegiblesContents(filteredTrails);
            const arrKeepLearningSections = await keepLearningSections(
                filteredTrails
            );
            const arrConcludedSections = await concludedSections(
                filteredTrails
            );

            let resultSections = arrSections
                .concat(arrKeepLearningSections)
                .concat(arrConcludedSections);
            resultSections = resultSections.filter((val) => {
                return val != null;
            });

            resultSections = resultSections.filter(section => {
                return section.trails.some(trail => !trail.type || trail.type === 'trail');
            });

            if (resultSections.length > 0) {
                resultSections.sort((a, b) =>
                    a.position < b.position ? -1 : 1
                );
            }

            _messages.success(res, req, { sections: resultSections, total });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'trails',
                'getColaborativo'
            );
        }
    },

    async create (req, res) {
        try {

            const payload = req.body

            const idItem = payload.items.map((item) => item.itemID._id)

            const items = []

            for (const i of idItem) {
                const index = items.indexOf(i)
                if (index === -1) {
                    items.push({
                        urlItem: `http://happmobi.com.br/${TINCAN_OWNER}/${idTrail}/${idItem}`,
                        urlTrail: `http://happmobi.com.br/${TINCAN_OWNER}/${idTrail}`,
                        itemID: i,
                    })
                }
            }

            payload.items = items
            if (payload.supportFileMaterial) {
                const fileArray = payload.supportFileMaterial.map(
                    key => req.files[key],
                )
                const supportMaterial = []

                for (const file of fileArray) {
                    let path = await azureBlob(file, 'trails/material')
                    path = path.replace(AZURE_BLOB_URL, DOMAIN)
                    const material = {
                        _id: new mongoose.Types.ObjectId(),
                        url: path,
                        name: file.name,
                        size: file.size,
                        deleted: false,
                    }
                    supportMaterial.push(material)
                }
                payload.supportMaterial = [
                    ...payload.supportMaterial,
                    ...supportMaterial,
                ]
                delete payload.supportFileMaterial
            }

            if (payload.galleryFiles) {
                const fileArray = payload.galleryFiles.map(
                    key => req.files[key],
                )
                const gallery = []

                for (const file of fileArray) {
                    let path = await azureBlob(file, 'trails/gallery')
                    path = path.replace(AZURE_BLOB_URL, DOMAIN)
                    const material = {
                        _id: new mongoose.Types.ObjectId(),
                        url: path,
                        name: file.name,
                        size: file.size,
                        deleted: false,
                    }
                    gallery.push(material)
                }
                payload.gallery = [
                    ...payload.gallery,
                    ...gallery,
                ]
                delete payload.galleryFiles
            }

            if (req?.segmentation) {
                await handleSegmentationOnCreate(req, payload)
            }

            const trail = await Trail.create(payload)
            await dispatch('create', 'trail', payload);

            _messages.success(
                res,
                req,
                { _id: trail._id },
                'Criação de dados',
                'trails',
                'create',
                trail,
                [],
                true,
                'CREATE'
            );
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'trails',
                'create'
            );
        }
    },

    async findById (req, res) {
        try {
            const _id = req.params.trailId;

            const query = { $and: [{ _id }] }

            if (req?.segmentation) {
                handleSegmentationOnQuery(req, 'owner', query)
            }

            const trail = await Trail.findOne(query)
                .populate({
                    path: 'items.itemID',
                    populate: { path: 'idEvaluation', select: ['description'], },
                });
            _messages.success(res, req, trail);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'trails',
                'findById'
            );
        }
    },

    async findByIdWithTrackingAndInnerText (req, res) {
        try {
            const findValue = req.params.trailId;
            const user = await getUserByToken(req);
            const tags = await getTagsElegiblesByToken(req);
            const allTrackingUser = await Tracking.find({
                userLogin: { $eq: user.networkLogin },
                $or: [
                    { expiredCompletion: { $exists: false } },
                    { expiredCompletion: { $eq: null } },
                ],
            });

            const query = findValue.match(/^[0-9a-fA-F]{24}$/)
                ? {
                    $or: [{ _id: findValue }, { titleURL: findValue }],
                }
                : { titleURL: findValue };

            // if (req?.segmentation) {
            //     handleSegmentationOnQuery(req, 'owner', query)
            // }

            const trails = await populateTrails(true, query);
            if (!trails || !trails[0]) {
                const course = await CourseModel.findById(findValue)
                if (course) {

                    return _messages.success(
                        res,
                        req,
                        course,
                        'Course',
                        'trails',
                        'findByIdWithTracking'
                    );
                } else {
                    return _messages.badRequest(
                        res,
                        req,
                        'Trilha não localizada',
                        'Trilha não localizada',
                        'trails',
                        'findByIdWithTrackingAndInnerText'
                    )

                }
            }
            if (
                !checkEligibilityTagsAnd(
                    tags,
                    trails[0].tagsAnd,
                    trails[0].tags
                )
            ) {
                _messages.badRequest(
                    res,
                    req,
                    'Você não esta elegível a este conteúdo',
                    'Você não esta elegível a este conteúdo',
                    'trails',
                    'findByIdWithTrackingAndInnerText'
                );
                return;
            }

            const trail = processExpirationDate(trails[0], user);
            let durationHours = 0;
            for (const item of trail.items) {
                durationHours += item.itemID.durationHours;
            }
            trail.durationHours = durationHours;
            const processedTrail = processTrailTracking(trail, allTrackingUser);
            _messages.success(res, req, processedTrail.trail);
        } catch (error) {
            console.log(error)
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'trails',
                'findByIdWithTracking'
            );
        }
    },

    async multiUploadCreate (req, res) {

        try {
            const { thumb, banner, background } = req.files;
            let { innerTextBanner } = req.files;

            let payload = {};
            if (req.fields.payload) {
                try {
                    payload = JSON.parse(req.fields.payload);
                    delete payload?.descriptionView
                } catch { }
            }

            const flag = checksIfTheEndDateIsLessThanTheStartDate(
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
                const verify = await Trail.find({
                    $or: [{
                        title: { $eq: payload.title },
                        _id: { $ne: payload._id },
                    }, {
                        _id: { $ne: payload._id },
                        titleURL: { $regex: payload.titleURL, $options: 'i' }
                    }]
                });
                if (verify.length > 0) {
                    const titleDuplicate = verify.some((trail) => trail.title === payload.title)
                    const titleURLDuplicate = verify.some((trail) => trail.titleURL === payload.titleURL)
                    if (titleURLDuplicate) payload.titleURL = `${payload.titleURL}-${verify.length}`

                    if (titleDuplicate) {
                        return _messages.badRequest(
                            res,
                            req,
                            'Já existe uma trilha com esse título!',
                            'Já existe uma trilha com esse título!',
                            'trilhas',
                            'create'
                        );
                    }
                }
                let thumbPath;
                let bannerPath;
                let backgroundPath;
                if (thumb) {
                    thumbPath = await azureBlob(thumb, 'trails/thumbs');
                    if (process.env.NODE_ENV !== 'local') {
                        thumbPath = thumbPath.replace(
                            AZURE_BLOB_URL,
                            DOMAIN
                        );
                    }
                }
                if (banner) {
                    bannerPath = await azureBlob(banner, 'trails/banners');
                }

                if (innerTextBanner) {
                    innerTextBanner = await azureBlob(innerTextBanner, 'trails/banners')
                } else {
                    innerTextBanner = payload.innerTextBanner
                }

                if (background) {
                    backgroundPath = await azureBlob(
                        background,
                        'trails/backgrounds'
                    );
                    if (process.env.NODE_ENV !== 'local') {
                        backgroundPath = backgroundPath.replace(
                            AZURE_BLOB_URL,
                            DOMAIN
                        );
                    }
                }

                if (payload.supportFileMaterial) {
                    const fileArray = payload.supportFileMaterial.map(
                        key => req.files[key],
                    )
                    const supportMaterial = []

                    for (const file of fileArray) {
                        let path = await azureBlob(file, 'trails/material')
                        path = path.replace(AZURE_BLOB_URL, DOMAIN)
                        const material = {
                            _id: new mongoose.Types.ObjectId(),
                            url: path,
                            name: file.name,
                            size: file.size,
                            deleted: false,
                        }
                        supportMaterial.push(material)
                    }
                    payload.supportMaterial = [
                        ...payload.supportMaterial,
                        ...supportMaterial,
                    ]
                    delete payload.supportFileMaterial
                }

                if (payload.galleryFiles) {
                    const fileArray = payload.galleryFiles.map((item) => {
                        return {
                            ...item,
                            file: req.files[item.name]
                        }
                    },
                    )
                    const gallery = []

                    for (const image of fileArray) {
                        const file = image.file
                        let path = await azureBlob(file, 'trails/gallery')
                        path = path.replace(AZURE_BLOB_URL, DOMAIN)
                        const material = {
                            _id: new mongoose.Types.ObjectId(),
                            url: path,
                            name: file.name,
                            size: file.size,
                            deleted: false,
                            title: image.title,
                            description: image.description
                        }
                        gallery.push(material)
                    }
                    payload.gallery = [
                        ...payload.gallery,
                        ...gallery,
                    ]
                    delete payload.galleryFiles
                }

                payload = {
                    ...payload,
                    enabled: true,
                    thumbPath: thumbPath,
                    bannerPath: bannerPath,
                    backgroundPath,
                    innerTextBanner
                };

                if (payload.post) {
                    const hasPostItem = payload.items.some((item) => item.itemID.kind === 'PostItem')
                    if (hasPostItem) {
                        const itemPostIndex = payload.items.findIndex((item) => item.itemID.kind === 'PostItem')
                        const item = payload.items[itemPostIndex]
                        if (item.itemID.title !== payload.title) {
                            const updatedItem = {
                                ...item.itemID,
                                title: payload.title,
                                description: payload.description,
                                enabled: true,
                                thumbPath: payload.thumbPath,
                                titleURL: payload.titleURL,
                            };
                            const { _doc } = await PostItem.findOneAndUpdate({ _id: item.itemID._id }, updatedItem, { new: true })
                            payload.items[itemPostIndex].itemID = _doc
                        }
                    } else {
                        const user = await getUserByToken(req);
                        const item = {
                            title: payload.title,
                            description: payload.description,
                            enabled: true,
                            thumbPath: payload.thumbPath,
                            titleURL: payload.titleURL,
                            author: user._id,
                            kind: 'PostItem'
                        }
                        const postItem = await PostItem.create(item);
                        if (payload.items.length) {
                            payload.items.push({
                                "mandatory": false,
                                "chief": false,
                                "optional": false,
                                "afterSeparator": "empty",
                                "itemID": postItem
                            })
                        } else {
                            payload.items = [{
                                "mandatory": false,
                                "chief": false,
                                "optional": false,
                                "afterSeparator": "empty",
                                "itemID": postItem
                            }]
                        }
                    }
                }
                const items = []
                const OldItems = payload.items

                delete payload.items

                if (req?.segmentation) {
                    await handleSegmentationOnCreate(req, payload)
                }

                const trail = await Trail.create(payload);
                await dispatch('create', 'trail', payload);

                for (const item of OldItems) {
                    if (item.itemID.kind === 'AluraItem') {
                        const { _id } = await getUserByToken(req);
                        let { itemAluraCreated, separators: updatedSeparators } = await createItemIfAlura(item, trail.separators, _id);
                        item.itemID = itemAluraCreated;
                        trail.separators = updatedSeparators;
                    }

                    items.push({
                        ...item,
                        urlItem: `http://happmobi.com.br/${TINCAN_OWNER}/${trail._id}/${item.itemID._id}`,
                        urlTrail: `http://happmobi.com.br/${TINCAN_OWNER}/${trail._id}`,
                        itemID: item.itemID._id,
                    });
                }

                trail.items = items
                updateProgressAluraItem(OldItems)
                await Trail.updateOne(
                    { _id: { $eq: trail._id } },
                    trail,
                    { new: true }
                );
                
                _messages.success(
                    res,
                    req,
                    trail,
                    'Atualização de dados',
                    'trails',
                    'multiUploadCreate',
                    trail,
                    [],
                    true,
                    'UPDATE'
                );

            }
        } catch (error) {
            console.log(error)
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'trails',
                'multiUploadCreate'
            );
        }
    },

    async changeStatus (req, res) {
        try {
            const { _id, enabled } = req.body;

            if (!_id) {
                throw new Error('Did not pass _id');
            }

            if (enabled === null || enabled === undefined) {
                throw new Error('Did not pass enabled');
            }

            const oldData = await Trail.updateOne(
                { _id: { $eq: _id } },
                { enabled: enabled }
            );
            const newData = await Trail.find({ _id: { $eq: _id } });

            _messages.success(
                res,
                req,
                newData,
                'Atualização de statud',
                'trails',
                'update',
                newData,
                oldData,
                true,
                'UPDATE'
            );
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'trails',
                'change-status'
            );
        }
    },

    async duplicate (req, res) {
        try {
            const { oldTrailId, ...body } = req.body;

            delete body?.descriptionView;

            if (body.collaborative) {
                body.collaborative = false
            }

            const docClone = new Trail(body);
            const newDbTrail = await docClone.save();

            if (oldTrailId) {
                await Trail.updateOne(
                    { _id: newDbTrail._id },
                    {
                        $set: {
                            items: body.items?.map((item) => {
                                const urlItem = item.urlItem?.replace(oldTrailId, newDbTrail._id) ?? null;
                                const urlTrail = item.urlTrail?.replace(oldTrailId, newDbTrail._id) ?? null;

                                return {
                                    ...item,
                                    urlItem,
                                    urlTrail,
                                }
                            }) ?? [],
                        }
                    }
                )
            }

            _messages.success(
                res,
                req,
                body,
                'Trail duplication',
                'trails',
            );
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'trails',
                'duplication'
            );
        }
    },

    async changeShowcase (req, res) {
        try {
            const { _id, showcase } = req.body;

            if (!_id) {
                throw new Error('Did not pass _id');
            }

            if (showcase === null || showcase === undefined) {
                throw new Error('Did not pass showcase');
            }

            const oldData = await Trail.updateOne(
                { _id: { $eq: _id } },
                { showcase: showcase }
            );
            const newData = await Trail.find({ _id: { $eq: _id } });

            _messages.success(
                res,
                req,
                newData,
                'Atualização de exibição na Vitrine',
                'trails',
                'update',
                newData,
                oldData,
                true,
                'UPDATE'
            );
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'trails',
                'change-showcase'
            );
        }
    },

    async update (req, res) {
        try {
            let { thumb, banner, background, innerTextBanner } = req.files
            const { _id } = JSON.parse(req.fields.payload)
            let { thumbPath, bannerPath, backgroundPath, } = await Trail.findOne(
                { _id: { $eq: _id } },
            )

            let payload = {}

            if (req.fields.payload) {
                try {
                    payload = JSON.parse(req.fields.payload)
                    delete payload?.descriptionView
                } catch { }
            }

            if (typeof payload.backgroundPath === 'object') {
                payload.backgroundPath = ''
            }

            const flag = checksIfTheEndDateIsLessThanTheStartDate(
                payload.startDate,
                payload.endDate,
            )
            if (!flag) {
                _messages.badRequest(
                    res,
                    req,
                    'A data final não pode ser menor que a data inicial!',
                    'A data final não pode ser menor que a data inicial!',
                    'items',
                    'multiUploadCreate',
                )
            } else {
                const verify = await Trail.find({
                    $or: [{
                        title: { $eq: payload.title },
                        _id: { $ne: payload._id },
                    }, {
                        _id: { $ne: payload._id },
                        titleURL: { $regex: payload.titleURL, $options: 'i' }
                    }]
                })

                if (verify.length > 0) {
                    const titleDuplicate = verify.some((trail) => trail.title === payload.title)
                    const titleURLDuplicate = verify.some((trail) => trail.titleURL === payload.titleURL)
                    if (titleURLDuplicate) payload.titleURL = `${payload.titleURL}-${verify.length}`
                    if (titleDuplicate) {
                        return _messages.badRequest(
                            res,
                            req,
                            'Já existe uma trilha com esse título!',
                            'Já existe uma trilha com esse título!',
                            'trails',
                            'update'
                        );
                    }
                }
                if (thumb) {
                    thumbPath = await azureBlob(thumb, 'trails/thumbs')
                    if (process.env.NODE_ENV !== 'local') {
                        thumbPath = thumbPath.replace(
                            AZURE_BLOB_URL,
                            DOMAIN,
                        )
                    }
                }
                if (banner) {
                    bannerPath = await azureBlob(banner, 'trails/banners')
                }

                if (innerTextBanner) {
                    innerTextBanner = await azureBlob(innerTextBanner, 'trails/banners')
                } else {
                    innerTextBanner = payload.innerTextBanner
                }

                if (background) {
                    backgroundPath = await azureBlob(
                        background,
                        'trails/backgrounds',
                    )
                    if (process.env.NODE_ENV !== 'local') {
                        backgroundPath = backgroundPath.replace(
                            AZURE_BLOB_URL,
                            DOMAIN,
                        )
                    }
                } else {
                    backgroundPath = payload.backgroundPath
                        ? payload.backgroundPath
                        : null
                }

                delete payload.thumb
                delete payload.banner

                if (payload.separators) {
                    for (separator of payload.separators) {
                        if (!ObjectId.isValid(separator._id)) {
                            const oldId = separator._id
                            const newId = new mongoose.Types.ObjectId()
                            payload.items = payload.items.map(item => {
                                if (item.afterSeparator == oldId) {
                                    item.afterSeparator = newId
                                }
                                return item
                            })
                            separator._id = newId
                        }
                    }
                }

                if (payload.supportFileMaterial) {
                    const fileArray = payload.supportFileMaterial.map(
                        key => req.files[key],
                    )
                    const supportMaterial = []

                    for (const file of fileArray) {
                        let path = await azureBlob(file, 'trails/material')
                        path = path.replace(AZURE_BLOB_URL, DOMAIN)
                        const material = {
                            _id: new mongoose.Types.ObjectId(),
                            url: path,
                            name: file.name,
                            size: file.size,
                            deleted: false,
                        }
                        supportMaterial.push(material)
                    }
                    payload.supportMaterial = [
                        ...payload.supportMaterial,
                        ...supportMaterial,
                    ]
                    delete payload.supportFileMaterial
                }

                if (payload.galleryFiles) {
                    const fileArray = payload.galleryFiles.map(
                        file => ({ ...file, file: req.files[file.name] }),
                    )
                    const gallery = []

                    for (const image of fileArray) {
                        const file = image.file
                        let path = await azureBlob(file, 'trails/gallery')
                        path = path.replace(AZURE_BLOB_URL, DOMAIN)
                        const material = {
                            _id: new mongoose.Types.ObjectId(),
                            url: path,
                            name: file.name,
                            size: file.size,
                            deleted: false,
                            title: image.title,
                            description: image.description
                        }
                        gallery.push(material)
                    }

                    payload.gallery = [
                        ...payload.gallery,
                        ...gallery,
                    ]
                    delete payload.galleryFiles
                }

                payload = {
                    ...payload,
                    thumbPath,
                    bannerPath,
                    backgroundPath,
                    innerTextBanner
                }

                const [trail] = await Trail.find({
                    _id: { $eq: payload._id },
                })

                if (payload.mandatory?.length == 0) {
                    // Setar todos os mandatory de itens como false.
                    trail.items.forEach(item => {
                        item.mandatory = false
                    })

                    payload.items.forEach(item => {
                        item.mandatory = false
                    })
                }

                if (payload.post) {
                    const hasPostItem = payload.items.some((item) => item.itemID.kind === 'PostItem')
                    if (hasPostItem) {
                        const itemPostIndex = payload.items.findIndex((item) => item.itemID.kind === 'PostItem')
                        const item = payload.items[itemPostIndex]
                        if (item.itemID.title !== payload.title) {
                            const updatedItem = {
                                ...item.itemID,
                                title: payload.title,
                                description: payload.description,
                                enabled: true,
                                thumbPath: payload.thumbPath,
                                titleURL: payload.titleURL,
                            };
                            const { _doc } = await PostItem.findOneAndUpdate({ _id: item.itemID._id }, updatedItem, { new: true })
                            payload.items[itemPostIndex].itemID = _doc
                        }
                    } else {
                        const user = await getUserByToken(req);
                        const item = {
                            title: payload.title,
                            description: payload.description,
                            enabled: true,
                            thumbPath: payload.thumbPath,
                            titleURL: payload.titleURL,
                            author: user._id,
                            kind: 'PostItem'
                        }
                        const postItem = await PostItem.create(item);
                        if (payload.items.length) {
                            payload.items.push({
                                "mandatory": false,
                                "chief": false,
                                "optional": false,
                                "afterSeparator": "empty",
                                "itemID": postItem
                            })
                        } else {
                            payload.items = [{
                                "mandatory": false,
                                "chief": false,
                                "optional": false,
                                "afterSeparator": "empty",
                                "itemID": postItem
                            }]
                        }
                    }
                }


                const items = []

                for (const item of payload.items) {
                    if (item.itemID.kind === 'AluraItem') {
                        const user = await getUserByToken(req);
                        let { itemAluraCreated, separators: updatedSeparators } = await createItemIfAlura(item, payload.separators, user._id);
                        item.itemID = itemAluraCreated;
                        trail.separators = updatedSeparators;
                    }

                    items.push({
                        ...item,
                        urlItem: `http://happmobi.com.br/${TINCAN_OWNER}/${trail._id}/${item.itemID._id}`,
                        urlTrail: `http://happmobi.com.br/${TINCAN_OWNER}/${trail._id}`,
                        itemID: item.itemID._id,
                    });
                }

                updateProgressAluraItem(payload.items)
                payload.items = items
                const oldData = await Trail.findOneAndUpdate(
                    { _id: { $eq: payload._id } },
                    payload,
                )
                await dispatch('update', 'trail', payload);

                const newData = await Trail.findOne({
                    _id: { $eq: payload._id },
                })

                await updateCertificateExpirationDate(req)

                _messages.success(
                    res,
                    req,
                    newData,
                    'Atualização de dados',
                    'trails',
                    'update',
                    newData,
                    oldData,
                    true,
                    'UPDATE',
                )

            }
        } catch (error) {
            console.log(error)
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'trails',
                'update',
            )
        }
    },

    async linkItems (req, res) {
        try {
            let exist = false;
            const { idItem, idTrail } = req.body;
            const { items } = await Trail.findOne({
                _id: { $eq: idTrail },
            });
            let oldData;
            let newData;

            items.forEach((item) => {
                if (item.itemID.toString() === idItem[0]) exist = true;
            });

            if (!exist) {
                for (const i of idItem) {
                    const index = items.indexOf(i);
                    if (index === -1) {
                        items.push({
                            urlItem: `http://happmobi.com.br/${TINCAN_OWNER}/${idTrail}/${idItem}`,
                            urlTrail: `http://happmobi.com.br/${TINCAN_OWNER}/${idTrail}`,
                            itemID: i,
                        });
                        oldData = await Trail.findByIdAndUpdate(idTrail, {
                            items,
                        });
                        newData = await Trail.find({ _id: { $eq: idTrail } });
                        await dispatch('update', 'trail',  newData);
                    }
                }

                _messages.success(
                    res,
                    req,
                    'Sucesso',
                    'Atualização de dados',
                    'trails',
                    'linkItems',
                    newData,
                    oldData,
                    true,
                    'UPDATE'
                );
            } else {
                _messages.badRequest(
                    res,
                    req,
                    'O item já está vinculado a esta trilha!',
                    'O item já está vinculado a esta trilha!',
                    'items',
                    '/linkItems'
                );
            }
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'trails',
                'items'
            );
        }
    },

    async linkSeparators (req, res) {
        try {
            const { idTrail, separator } = req.body;
            const { separators } = await Trail.findOne({
                _id: { $eq: idTrail },
            });
            let oldData;
            let newData;

            separators.push(separator);
            oldData = await Trail.findByIdAndUpdate(idTrail, {
                separators,
            });
            newData = await Trail.find({ _id: { $eq: idTrail } });
            await dispatch('update', 'trail',  newData);

            _messages.success(
                res,
                req,
                'Sucesso',
                'Atualização de dados',
                'trails',
                'linkSeparators',
                newData,
                oldData,
                true,
                'UPDATE'
            );
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'trails',
                'separators'
            );
        }
    },

    async updateSeparators (req, res) {
        try {
            let exist = false;
            const { idTrail, separator } = req.body;
            const { separators } = await Trail.findOne({
                _id: { $eq: idTrail },
            });
            let oldData;
            let newData;
            const update = separators.map((separatorDB) => {
                if (separatorDB._id.toString() == separator._id)
                    separatorDB.title = separator.title;
                return separatorDB;
            });
            oldData = await Trail.findByIdAndUpdate(idTrail, {
                separators: update,
            });
            newData = await Trail.find({ _id: { $eq: idTrail } });
            await dispatch('update', 'trail',  newData);

            _messages.success(
                res,
                req,
                'Sucesso',
                'Atualização de dados',
                'trails',
                'linkSeparators',
                newData,
                oldData,
                true,
                'UPDATE'
            );
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'trails',
                'separators'
            );
        }
    },

    async unlinkSeparators (req, res) {
        try {
            let exist = false;
            const { idTrail, separator } = req.body;
            const { separators } = await Trail.findOne({
                _id: { $eq: idTrail },
            });
            let oldData;
            let newData;

            const update = separators.filter(
                (separatorDB) => separatorDB._id.toString() !== separator._id
            );
            oldData = await Trail.findByIdAndUpdate(idTrail, {
                separators: update,
            });
            newData = await Trail.find({ _id: { $eq: idTrail } });
            await dispatch('update', 'trail',  newData);

            _messages.success(
                res,
                req,
                'Sucesso',
                'Atualização de dados',
                'trails',
                'linkSeparators',
                newData,
                oldData,
                true,
                'UPDATE'
            );
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'trails',
                'separators'
            );
        }
    },

    async findAll (req, res) {
        try {
            const { skip, limit } = pagination(req);
            const { order, sort } = ordernation(req);
            const searchBy = req.query.searchBy;
            const archive = req.query.archive;
            const noLimit = req.query?.all;

            let total = 0;
            if (req.query.type) {
                const query = { $and: [{}] }

                if (req?.segmentation) {
                    handleSegmentationOnQuery(req, 'owner', query)
                }

                total = await Trail.countDocuments(query);
                const trails = await Trail.find(query);

                _messages.success(res, req, {
                    data: trails,
                    total,
                });

            } else {
                const escapedSearchBy = searchBy ? searchBy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
                const query = {
                    $and: [{
                        archive: archive ? { $eq: archive === 'true' } : { $ne: true }
                    }]
                }
                if (searchBy) {
                    query.$and.push({
                        $or: [
                            {
                                description: {
                                    $regex: escapedSearchBy,
                                    $options: 'i',
                                }
                            },
                            {
                                title: {
                                    $regex: escapedSearchBy,
                                    $options: 'i',
                                },
                            },
                        ],
                    })
                }

                if (noLimit) {
                    query.$and.push({
                        enabled: true,
                        archive: { $ne: true }
                    })
                }

                if (req?.segmentation) {
                    handleSegmentationOnQuery(req, 'owner', query)
                }

                total = await Trail.find(query).countDocuments();

                const trails = await Trail.find(query)
                    .populate({
                        path: 'items.itemID',
                        populate: { path: 'idEvaluation', select: ['description'], },
                    })
                    .sort({ [order]: sort })
                    .skip(parseInt(skip))
                    .limit(parseInt(noLimit ? 0 : limit));

                const data = await processTrailWorkload(trails)

                _messages.success(res, req, {
                    data,
                    total,
                });
            }
        } catch (error) {
            console.error(error)
            return _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'trails',
                'findAll'
            );
        }
    },

    async returnItemsByTrail (req, res) {
        try {
            const { skip, limit } = pagination(req)
            const { order, sort } = ordernation(req)
            const { id } = req.params
            const user = await getUserByToken(req)

            const query = {
                $and: [{
                    _id: { $eq: id }
                }]
            }

            if (req?.segmentation) {
                handleSegmentationOnQuery(req, 'owner', query)
            }

            const total = await Trail.findOne(query, 'items')

            const trails = await populateTrails(
                true,
                query,
                {
                    [order]: sort,
                },
                false,
                true,
                parseInt(skip),
                parseInt(limit),
            )

            const items = trails[0].items

            // const { items } = await Trail
            //     .findOne({
            //         _id: { $eq: id },
            //     })
            //     .sort({ [order]: sort })
            //     .populate('items')
            //     .skip(parseInt(skip))
            //     .limit(parseInt(limit))

            for (const item of items) {
                const tracking = await Tracking.findOne({
                    item: { $eq: item._id },
                    userLogin: { $eq: user.networkLogin },
                })

                if (tracking) {
                    if (tracking.kind === 'SCORMTracking') {
                        item.completion = isSCORMCompleted(
                            tracking.lessonStatus,
                        )
                            ? 1
                            : 0
                    } else {
                        item.completion = tracking.completion
                    }
                }

                if (item.kind === 'ExamItem') {
                    const evaluation = await Evaluation.findById(
                        item.idEvaluation,
                    )
                    if (evaluation) {
                        item.descriptionEvaluation = evaluation.description
                    }
                }
            }
            _messages.success(res, req, {
                data: items,
                separators: trails[0].separators,
                total: total.items.length,
            })
        } catch (error) {
            console.log(error)
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'trails',
                'returnItemsByTrail',
            )
        }
    },

    async returnItemsByTrailMenu (req, res) {
        try {
            const { id } = req.params;
            const user = await getUserByToken(req);

            // const { items, isSequenceEnabled } = await Trail
            //     .findOne({
            //         _id: { $eq: id },
            //     })
            //     .populate({
            //         path: 'items',
            //         match: {
            //             enabled: true,
            //             deleted: 0,
            //         },
            //     })

            const query = {
                $and: [{
                    _id: { $eq: id }
                }]
            }

            if (req?.segmentation) {
                handleSegmentationOnQuery(req, 'owner', query)
            }

            const trails = await populateTrails(true, query);

            const { items, isSequenceEnabled } = trails[0];

            for (const item of items) {
                const tracking = await Tracking.findOne({
                    item: { $eq: item.itemID._id },
                    userLogin: { $eq: user.networkLogin },
                });

                if (tracking) {
                    if (tracking.kind === 'SCORMTracking') {
                        item.completion = isSCORMCompleted(
                            tracking.lessonStatus
                        )
                            ? 1
                            : 0;
                    } else {
                        item.completion = tracking.completion;
                    }
                }

                if (item.kind === 'ExamItem') {
                    const evaluation = await Evaluation.findById(
                        item.idEvaluation
                    );
                    if (evaluation)
                        item.descriptionEvaluation = evaluation.description;
                }
            }
            _messages.success(res, req, {
                data: items,
                isSequenceEnabled: isSequenceEnabled,
            });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'trails',
                'returnItemsByTrail'
            );
        }
    },

    async unlinkItems (req, res) {
        try {
            const { idItem, idTrail } = req.body;
            const { items } = await Trail.findOne(
                {
                    _id: { $eq: idTrail },
                },
                'items'
            );

            for (const i in items) {
                if (items[i] && items[i].itemID.toString() === idItem) {
                    delete items[i];
                }
            }

            const arrItens = items.filter((val) => {
                return val !== null;
            });

            const oldData = await Trail.findByIdAndUpdate(idTrail, {
                items: arrItens,
            });
            const newData = await Trail.find({ _id: { $eq: idTrail } });
            await dispatch('update', 'trail',  newData);

            _messages.success(
                res,
                req,
                'Sucesso',
                'Atualização de dados',
                'trails',
                'unlinkItems',
                newData,
                oldData,
                true,
                'UPDATE'
            );
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'trails',
                'unlinkItems'
            );
        }
    },

    async changeItemOrderFromTrail (req, res) {
        try {
            const { idTrail, order } = req.body;

            const { items } = await Trail.findOne(
                {
                    _id: { $eq: idTrail },
                },
                'items'
            );

            const itemsInOrder = order.items;
            const separatorsInOrder = order.separators;

            // Valida os ids.
            const hasAllItems =
                // items.length == itemsInOrder.length &&
                itemsInOrder.reduce((hasAllItems, val) => {
                    if (hasAllItems == false) {
                        return false;
                    }

                    return (
                        items.findIndex(
                            (i) => val.itemID._id == i.itemID.toString()
                        ) >= 0
                    );
                }, true);
            if (hasAllItems) {
                // Atualiza lista de items.
                const newTrailItems = itemsInOrder.map((idItem) => {
                    const item = items.find(
                        (i) => i.itemID.toString() === idItem.itemID._id
                    );
                    if (!item) {
                        throw new Error(
                            `item with id ${idItem} not found in items array`
                        );
                    }

                    return idItem;
                });
                const oldData = await Trail.findByIdAndUpdate(idTrail, {
                    items: newTrailItems,
                    separators: separatorsInOrder,
                });
                const newData = await Trail.find({ _id: { $eq: idTrail } });
                await dispatch('update', 'trail',  newData);

                _messages.success(
                    res,
                    req,
                    'Sucesso',
                    'Atualização da ordem dos items',
                    'trails',
                    'changeItemOrderFromTrail',
                    newData,
                    oldData,
                    true,
                    'UPDATE'
                );
            } else {
                _messages.badRequest(
                    res,
                    req,
                    'Não tem todos os items vinculados a trilha',
                    'Não tem todos os items vinculados a trilha',
                    'trails',
                    'changeItemOrderFromTrail'
                );
            }
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'trails',
                'changeItemOrderFromTrail'
            );
        }
    },

    async returnBannersElegibles_new (req, res) {
        // # Nova versão para retornar banner, para melhorar a performance
        try {
            var dtInicio = new Date();

            const user = await getUserByToken(req);
            const tags = await getTagsElegiblesByToken(req);
            let banners = [];
            const itemsIDProcessados = [];

            for (const tag of user.tags) {
                delete tag.createdAt;
                tags.push(tag);
            }

            const items = await Item.find({
                enabled: true,
                highlighted: true,
                startDate: { $lt: getDateTodayWithoutHours() },
                endDate: { $gt: getDateTodayWithoutHours() },
            });

            const arrItemsID = [];
            for (const item of items) {
                arrItemsID.push(String(item._id));
            }

            const trails = await populateTrails(
                false,
                {
                    enabled: true,
                    $or: [
                        { tags: { $in: tags } },
                        { tagsAnd: { $in: tags } },
                        { mandatory: { $in: tags } },
                    ],
                    'items.itemID': { $in: arrItemsID },
                },
                { createdAt: 'desc' },
                false,
                { highlighted: true }
            );

            for (const trail of trails) {
                for (const item of trail.items) {
                    // if (itemsIDProcessados.indexOf(item.itemID) < 0 && arrItemsID.indexOf(String(item.itemID)) > -1) {
                    banners.push({
                        trailTitleURL: trail.titleURL,
                        itemTitleURL: item.titleURL,

                        itemID: item.itemID,
                        trailID: trail._id.toString(),
                        bannerPath: item.bannerPath || null,
                        startDate: formatDateWithoutHours(item.startDate),
                    });

                    itemsIDProcessados.push(item.itemID);
                    // }
                }
            }

            if (banners.length > 0)
                banners = banners.sort((a, b) =>
                    a.startDate > b.startDate ? -1 : 1
                );
            _messages.success(res, req, banners);
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'trails',
                'returnBannersElegibles'
            );
        }
    },

    async returnBannersElegibles (req, res) {
        try {
            var dtInicio = new Date();

            const user = await getUserByToken(req);
            const tags = await getTagsElegiblesByToken(req);
            let banners = [];
            const itemsID = [];
            for (const tag of user.tags) {
                delete tag.createdAt;
                tags.push(tag);
            }

            const trails = await populateTrails(
                false,
                {
                    enabled: true,
                    $or: [
                        { tags: { $in: tags } },
                        { tagsAnd: { $in: tags } },
                        { mandatory: { $in: tags } },
                    ],
                },
                { createdAt: 'desc' },
                false,
                { highlighted: true }
            );

            for (const trail of trails) {
                for (const item of trail.items) {
                    const flag = await checkItem(item);
                    if (flag && itemsID.indexOf(item.id) < 0) {
                        banners.push({
                            itemID: item.id,
                            trailID: trail._id.toString(),
                            bannerPath: item.bannerPath || null,
                            startDate: formatDateWithoutHours(item.startDate),
                        });
                        itemsID.push(item.id);
                    }
                }
            }

            if (banners.length > 0)
                banners = banners.sort((a, b) =>
                    a.startDate > b.startDate ? -1 : 1
                );
            _messages.success(res, req, banners);
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'trails',
                'returnBannersElegibles'
            );
        }
    },

    async returnTrailsByIDS (req, res) {
        try {
            const { trailsIDS } = req.body;
            const arrTrails = [];

            for (const t of trailsIDS) {
                const trail = await Trail.findById(t, ['title', 'description']);
                arrTrails.push(trail);
            }

            _messages.success(res, req, arrTrails);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'trails',
                'returnTrailsByIDS'
            );
        }
    },

    async returnLinkTrailByItem (idItem) {
        return new Promise(async (resolve, reject) => {
            try {
                const trails = await Trail.find({ 'items.itemID': idItem });
                const trail = trails[0];
                var item = null;

                for (var tmpItem = 0; tmpItem < trail.items.length; tmpItem++) {
                    if (trail.items[tmpItem].itemID == idItem) {
                        item = trail.items[tmpItem];
                    }
                }

                resolve(item);
            } catch (error) {
                reject(error);
            }
        });
    },

    async mandatory (req, res) {
        try {
            const { idTrail, idItem, mandatory } = req.body;
            const trail = await Trail.findById(idTrail);

            const items = trail.items;

            const hasMandatory = trail.mandatory.length > 0;

            if (!hasMandatory && mandatory === true) {
                _messages.badRequest(
                    res,
                    req,
                    'É necessário que a trilha contenha tags de obrigatoriedade para atribuir obrigatoriedade a um item.',
                    'É necessário que a trilha contenha tags de obrigatoriedade para atribuir obrigatoriedade a um item.'
                );

                return;
            }

            items.forEach((i) => {
                if (i.itemID.toString() === idItem) i.mandatory = mandatory;
            });

            await Trail.findByIdAndUpdate(idTrail, { items });

            _messages.success(res, req, 'Obrigatoriedade gravada com sucesso!');
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno no servidor',
                'trails',
                'mandatory'
            );
        }
    },

    async xapi (req, res) {
        try {
            const trails = await Trail.find();

            for (const trail of trails) {
                const items = [];

                if (!trail.items_new) {
                    for (const item of trail.items) {
                        items.push({
                            itemID: item._id,
                            urlTrail: `http://happmobi.com.br/${TINCAN_OWNER}/${trail.id}`,
                            urlItem: `http://happmobi.com.br/${TINCAN_OWNER}/${trail.id
                                }/${item._id.toString()}`,
                            mandatory: false,
                        });
                    }

                    await Trail.findByIdAndUpdate(trail._id, {
                        items_new: items,
                    });
                } else {
                    await Trail.findByIdAndUpdate(trail._id, {
                        items: trail.items_new,
                    });
                    await Trail.findByIdAndUpdate(trail._id, {
                        $unset: { items_new: 1 },
                    });
                }
            }

            res.status(200).json(trails);
        } catch (error) {
            console.log(error);
            res.status(500).send('Erro interno no servidor!');
        }
    },

    /**
     * Rota /trails/{idTrilha}/{idItem}:
     * Envia a informação de UrlItem e UrlTrilha para o envio do XAPI.
     * @param {*} req Request
     * @param {*} res Response
     */
    async getCourseInformation (req, res) {
        try {
            const findValueTrail = req.params.trailId;
            const itemId = req.params.itemId;

            const trail = await Trail.findOne(
                findValueTrail.match(/^[0-9a-fA-F]{24}$/)
                    ? {
                        $or: [
                            { _id: findValueTrail },
                            { titleURL: findValueTrail },
                        ],
                    }
                    : { titleURL: findValueTrail }
            );
            const item = trail.items.find((i) => i.itemID == itemId);

            if (!item) {
                throw new Error(
                    `Não encontrou o item ${itemId} na trilha ${trailId}`
                );
            }

            const response = {
                urlItem: item.urlItem,
                urlTrail: item.urlTrail,
            };

            _messages.success(res, req, response);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno do servidor',
                'trails',
                'getCourseInformation'
            );
        }
    },

    async returnTrailsByUser (req, res) {
        try {
            const { userId } = req.query;

            const query = {
                $and: [{
                    author: { $eq: userId }
                }]
            }

            if (req?.segmentation) {
                handleSegmentationOnQuery(req, 'owner', query)
            }

            const trails = await populateTrails(true, query);

            _messages.success(res, req, { trails });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno do servidor'
            );
        }
    },

    async updateModeration (req, res) {
        try {
            const { moderation, tags, trailId } = req.body;

            if (!moderation || !trailId) {
                _messages.badRequest(res, req, 'Payload inválido', {
                    message: 'Payload inválido',
                });
            }
            const trail = await Trail.findByIdAndUpdate(
                trailId,
                { moderation, tags },
                { new: true }
            );

            const user = await User.findById(trail.author);

            if (moderation === 'approved' || moderation === 'disapproved') {
                const campaign = createModerationAlert(
                    trail,
                    moderation === 'approved' ? 'aprovado' : 'recusado'
                );
                createMessagesFromBackend()
            }

            if (moderation === 'approved') {
                await GamificationKafka.publishEventRuleValidation({
                    networkLogin: user.networkLogin,
                    events: [EVENT_CATEGORY.UPLOADED_CONTENT],
                });
            }

            _messages.success(res, req, { message: 'Trilha atualizada' });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno do servidor',
                'trails',
                'updateModeration'
            );
        }
    },

    async saveComplaint (req, res) {
        try {
            const { reason, trailId } = req.body;

            if (!reason) {
                _messages.badRequest(res, req, 'Payload inválido', {
                    message: 'Payload inválido',
                });
            }

            await Trail.findByIdAndUpdate(trailId, {
                $push: { complaints: { reason } },
                moderation: 'denounced',
            });

            _messages.success(res, req, { message: 'Trilha atualizada' });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno do servidor',
                'trails',
                'updateModeration'
            );
        }
    },

    async uploadMaterial (req, res) {
        try {
            let trailId = req.fields.trailId;
            let fileArray = Object.keys(req.files).map((key) => req.files[key]);
            const supportMaterial = [];

            for (let file of fileArray) {
                let path = await azureBlob(file, 'trails/material');
                const material = {
                    _id: new mongoose.Types.ObjectId(),
                    url: path,
                    name: file.name,
                    size: file.size,
                    deleted: false,
                };
                supportMaterial.push(material);
            }

            await Trail.findByIdAndUpdate(trailId, {
                $push: { supportMaterial: supportMaterial },
            });

            _messages.success(res, req, { message: 'Upload concluído!' });
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno do servidor',
                'trails',
                'uploadMaterial'
            );
        }
    },

    async listMaterial (req, res) {
        try {
            let trailId = req.params.id;
            const trail = await Trail.findById(trailId);
            const filteredSupportArray = trail.supportMaterial.filter(
                (x) => x.deleted === false
            );
            _messages.success(res, req, filteredSupportArray);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno do servidor',
                'trails',
                'listMaterial'
            );
        }
    },

    async listGallery (req, res) {
        try {
            let trailId = req.params.id;

            const query = {
                $and: [{
                    _id: {
                        $eq: trailId
                    }
                }]
            }

            if (req?.segmentation) {
                handleSegmentationOnQuery(req, 'owner', query)
            }

            const trail = await Trail.findOne(query);

            const filteredGalleryArray = trail.gallery.filter(
                (x) => x.deleted === false
            );

            _messages.success(res, req, filteredGalleryArray);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno do servidor',
                'trails',
                'listMaterial'
            );
        }
    },

    async downloadMaterial (req, res) {
        try {
            let trailId = req.body.trailId;
            let materialId = req.body.materialId;
            const trail = await Trail.findById(trailId);
            const requestingUser = getUserByToken(req);

            for (let material of trail.supportMaterial) {
                if (String(material._id) === materialId) {
                    Log.create({
                        user: requestingUser._id,
                        type: 'FILE DOWNLOAD',
                        message: `TRILHA: ${trail.title} (${material.name})`,
                        component: 'TRAILS',
                        dataNew: [],
                        dataOld: [],
                        route: null,
                        ip: null,
                        login: null,
                        groups: [],
                    });
                }
            }

            _messages.success(res, req);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno do servidor',
                'trails',
                'downloadMaterial'
            );
        }
    },

    async deleteMaterial (req, res) {
        try {
            let trailId = req.body.trailId;
            let materialId = mongoose.Types.ObjectId(req.body.materialId);

            await Trail.findOneAndUpdate(
                { _id: trailId, 'supportMaterial._id': materialId },
                {
                    $set: {
                        'supportMaterial.$.deleted': true,
                    },
                }
            );

            _messages.success(res, req);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                'Erro interno do servidor',
                'trails',
                'downloadMaterial'
            );
        }
    },

    async archive (req, res) {
        const trailId = req.params.trailId;

        const trail = await Trail.findByIdAndUpdate(trailId, { $set: { enabled: false, archive: true, archivedAt: new Date() } });
        await dispatch('update', 'trail', trail);

        res.status(204).send();
    },

    async unarchive (req, res) {
        const trailId = req.params.trailId;

        const trail = await Trail.findByIdAndUpdate(trailId, { $set: { archive: false, archivedAt: null } });
        await dispatch('update', 'trail', trail);

        res.status(204).send();
    }
};

function processTrailAndItems (trail) {
    let duration = 0;
    for (const item of trail.items) {
        duration += item.itemID.durationHours;
    }

    trail.items = trail.items.map((item) => {
        return {
            _id: item._id,
            title: item.itemID.title,
            description: item.itemID.description,
            durationHours: item.itemID.durationHours,
        };
    });

    trail.duration = duration;

    return trail;
}

function prepareObject (trail) {
    return {
        _id: trail._id,
        title: trail.title,
        description: trail.description,
        startDate: trail.startDate,
        endDate: trail.endDate,
        tags: trail.tags,
        createdAt: trail.createdAt,
        updatedAt: trail.updatedAt,
        items: trail.items,
        duration: trail.duration,
        thumbPath: trail.thumbPath,
        collaborative: trail.collaborative,
    };
}

function createModerationAlert (trail, verb) {
    const title = `O conteúdo ${trail.title} foi ${verb}!`;
    const text = `Seu conteúdo ${trail.title} acabou de ser ${verb} por um moderador!`;
    const texthtml = `<p>Seu conteúdo ${trail.title} acabou de ser ${verb} por um moderador!</p>`;
    const communication = ['notification'];
    const mode = 'automatic';
    const category = 'notify';
    const target = {
        trailid: trail._id,
        url: `${process.env.DOMAIN}/#/login/entrar?redirectTo=/menu/${trail._id}`,
    };
    return { title, text, communication, category, target, mode, texthtml };
}

async function createMessagesFromBackend (body) {
    try {
        const campaign = body;
        const target = campaign.target;
        let targetUsers = [];

        if (!target.value.user) {
            targetUsers = await processTargetUsers(target, campaign.category);
        } else {
            targetUsers.push({ ...target.value.user });
        }

        await sendMessageToKafka(campaign, targetUsers);
    } catch (error) {
        console.log(error);
    }
}
