require('dotenv').config()
const { DOMAIN, AZURE_BLOB_URL } = process.env
const momentz = require('moment-timezone')
const moment = require('moment')
const path = require('path')
const httpStatus = require('http-status-codes')
const mongoose = require('mongoose')
const Busboy = require('busboy')
const unzipper = require('unzipper')
const etl = require('etl')
const parseXml = require('@rgrove/parse-xml')
const { filter, reduce, pipe } = require('ramda')
const { Trail } = require('../trails/model')
const { error } = require('../../utils/logger')
const _errors = require('../../utils/errors')
const _messages = require('../../utils/messages')
const _functions = require('../../utils/functions')
const { Item, DocumentItem, MediaItem, SCORMItem, ExamItem, AudioItem, SoundcloudItem } = require('./model')
const { Tracking } = require('../tracking/model')
const {
    awsAmazon,
    azureBlob,
    isSCORMManifestFile,
    isSCORMSchemaFile,
    vimeoFilePath,
} = require('../../utils/files')

const {
    getTagsElegiblesByToken,
} = require('../sections/business')
const {
    getUserByToken,
} = require('../../utils/functions')
const ITEM_KINDS = Object.freeze({
    DocumentItem: DocumentItem,
    MediaItem: MediaItem,
    SCORMItem: SCORMItem,
    ExamItem: ExamItem,
    AudioItem: AudioItem,
    SoundcloudItem: SoundcloudItem,
})

const ItemController = {

    async itemColaborativo (req, res) {
        if (!req.is('multipart/form-data')) {
            return res.status(httpStatus.NOT_ACCEPTABLE).send()
        }
        let payload = {}
        if (req.fields.payload) {
            try {
                payload = JSON.parse(req.fields.payload)
            } catch { }
        }

        const flag = _functions.checksIfTheEndDateIsLessThanTheStartDate(payload.startDate, payload.endDate)
        if (!flag) {
            _messages.badRequest(res, req, 'A data final não pode ser menor que a data inicial!', 'A data final não pode ser menor que a data inicial!', 'items', '')
        } else {
            const user = await getUserByToken(req)

            const verify = await Item
                .find({
                    title: { $eq: payload.title },
                })
            if (verify.length === 0) {
                const ItemModel = ITEM_KINDS[req.body.kind || payload.kind] || Item

                try {
                    const { thumb, content } = req.files
                    let thumbPath
                    let contentPath

                    if (thumb) {
                        thumbPath = await azureBlob(thumb, 'items/thumbs')
                        thumbPath = process.env.NODE_ENV === 'local' ? thumbPath : thumbPath.replace(AZURE_BLOB_URL, DOMAIN)
                    }

                    if (payload.kind !== 'MediaItem') {
                        if (content) {
                            contentPath = await azureBlob(content, 'items/content')
                            contentPath = process.env.NODE_ENV === 'local' ? contentPath : contentPath.replace(AZURE_BLOB_URL, DOMAIN)
                        }

                        if (!contentPath && payload.content && (ItemModel === MediaItem || ItemModel === AudioItem || ItemModel === DocumentItem)) {
                            contentPath = payload.content
                        }
                    }

                    if (payload.kind !== 'SoundcloudItem' || payload.kind !== 'MediaItem') {
                        payload = {
                            ...payload,
                            enabled: true,
                            thumbPath: thumbPath || undefined,
                            contentPath: contentPath || undefined,
                        }
                    } else {
                        payload = {
                            ...payload,
                            enabled: true,
                            thumbPath: thumbPath || undefined,
                        }
                    }

                    if (payload.kind === 'MediaItem') {
                        if (!content) {
                            payload.contentPath = payload.content
                        } else {
                            payload.contentPath = String(new Date().toISOString())
                            vimeoFilePath(content, payload, user)
                        }
                    }

                    delete payload.thumb
                    delete payload.content

                    payload.author = user._id

                    const item = await ItemModel.create(payload)

                    if (item._id) {
                        await Trail.create({
                            backgroundPath: null,
                            bannerPath: null,
                            completion: null,
                            description: item.description,
                            enabled: true,
                            endDate: item.endDate,
                            highlighted: false,
                            isSequenceEnabled: false,
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
                            moderation: user.groupsAD.includes('PERFIL_Colaborador_Livre') ? 'approved' : 'pending',
                            thumbPath: thumbPath,
                            title: item.title,
                        })
                    }
                    _messages.success(res, req, item._id)
                } catch (error) {
                    if (error.message === 'Something went wrong') {
                        _messages.internalServer(res, req, error.error, error, 'itemColaborativo')
                    }
                    console.log(error)
                    if (error.name === 'ValidationError') {
                        const messages = {}
                        for (const k in error.errors) messages[k] = error.errors[k].message
                        _messages.badRequest(res, req, error, { name: error.name, messages }, 'items', 'itemColaborativo')
                    } else {
                        _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'items', 'itemColaborativo')
                    }
                }
            } else {
                _messages.badRequest(res, req, 'Já existe um item com esse título!', 'Já existe um item com esse título!', 'items', 'itemColaborativo')
            }
        }
    },

    async create (req, res) {
        const ItemModel = ITEM_KINDS[req.body.kind] || Item

        try {
            const { _id } = await ItemModel.create(req.body)

            _messages.success(res, req, { _id })
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'items', 'create')
        }
    },

    async multiUploadCreate (req, res) {
        let payload = {}
        if (req.fields.payload) {
            try {
                payload = JSON.parse(req.fields.payload)
            } catch { }
        }

        const flag = _functions.checksIfTheEndDateIsLessThanTheStartDate(payload.startDate, payload.endDate)
        if (!flag) {
            _messages.badRequest(res, req, 'A data final não pode ser menor que a data inicial!', 'A data final não pode ser menor que a data inicial!', 'items', 'multiUploadCreate')
        } else {
            const user = await getUserByToken(req)

            const verify = await Item
                .find({
                    title: { $eq: payload.title },
                })
            if (verify.length === 0) {
                const ItemModel = ITEM_KINDS[req.body.kind || payload.kind] || Item

                try {
                    const { thumb, content, banner } = req.files
                    let thumbPath
                    let contentPath
                    let bannerPath

                    if (thumb) {
                        thumbPath = await azureBlob(thumb, 'items/thumbs')
                        thumbPath = process.env.NODE_ENV === 'local' ? thumbPath : thumbPath.replace(AZURE_BLOB_URL, DOMAIN)
                    }

                    if (banner) {
                        bannerPath = await azureBlob(banner, 'items/banners')
                        bannerPath = process.env.NODE_ENV === 'local' ? bannerPath : bannerPath.replace(AZURE_BLOB_URL, DOMAIN)
                    }

                    if (payload.kind !== 'MediaItem') {
                        if (content) {
                            contentPath = await azureBlob(content, 'items/content')
                            contentPath = process.env.NODE_ENV === 'local' ? contentPath : contentPath.replace(AZURE_BLOB_URL, DOMAIN)
                        }

                        if (!contentPath && payload.content && (ItemModel === MediaItem || ItemModel === AudioItem)) {
                            contentPath = payload.content
                            delete payload.content
                        }
                    }

                    if (payload.kind !== 'SoundcloudItem' || payload.kind !== 'MediaItem') {
                        payload = {
                            ...payload,
                            enabled: true,
                            thumbPath: thumbPath || undefined,
                            bannerPath: bannerPath || undefined,
                            contentPath: contentPath || undefined,
                        }
                    } else {
                        payload = {
                            ...payload,
                            enabled: true,
                            thumbPath: thumbPath || undefined,
                            bannerPath: bannerPath || undefined,
                        }
                    }

                    if (payload.kind === 'MediaItem') {
                        if (!content) {
                            payload.contentPath = payload.content
                        } else {
                            payload.contentPath = String(new Date().toISOString())
                            vimeoFilePath(content, payload, user)
                        }
                    }

                    delete payload.thumb
                    delete payload.banner
                    delete payload.content
                    payload.author = user._id

                    const { _id } = await ItemModel.create(payload)
                    _messages.success(res, req, { _id })
                } catch (error) {
                    if (error.name === 'ValidationError') {
                        const messages = {}
                        for (const k in error.errors) messages[k] = error.errors[k].message
                        _messages.badRequest(res, req, error, { name: error.name, messages }, 'items', 'multiUploadCreate')
                    } else {
                        _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'items', 'multiUploadCreate')
                    }
                }
            } else {
                _messages.badRequest(res, req, 'Já existe um item com esse título!', 'Já existe um item com esse título!', 'items', 'multiUploadCreate')
            }
        }
    },

    async update (req, res) {
        let payload = {}
        if (req.fields.payload) {
            try {
                payload = JSON.parse(req.fields.payload)
            } catch { }
        }

        const flag = _functions.checksIfTheEndDateIsLessThanTheStartDate(payload.startDate, payload.endDate)
        if (!flag) {
            _messages.badRequest(res, req, 'A data final não pode ser menor que a data inicial!', 'A data final não pode ser menor que a data inicial!', 'items', 'multiUploadCreate')
        } else {
            const user = await getUserByToken(req)

            const verify = await Item
                .find({
                    title: { $eq: payload.title },
                    _id: { $ne: payload._id },
                })
            if (verify.length === 0) {
                const ItemModel = ITEM_KINDS[req.body.kind || payload.kind] || Item
                try {
                    const content = req.files.content
                    const thumb = req.files.thumb
                    const banner = req.files.banner

                    let thumbPath
                    let thumbPath2
                    let contentPath
                    let bannerPath

                    if (thumb) {
                        thumbPath = await azureBlob(thumb, 'items/thumbs')
                        thumbPath = thumbPath.replace(AZURE_BLOB_URL, DOMAIN)
                    }

                    if (banner) {
                        bannerPath = await azureBlob(banner, 'items/banners')
                    }

                    if (payload.kind !== 'MediaItem') {
                        if (content) {
                            contentPath = await azureBlob(content, 'items/content')
                        }
                    }

                    if (!contentPath && payload.content && ItemModel === MediaItem) {
                        contentPath = payload.content
                        delete payload.content
                    }

                    if (payload.kind === 'MediaItem') {
                        if (!content) {
                            payload.contentPath = payload.content
                        } else {
                            payload.contentPath = String(new Date().toISOString())
                            vimeoFilePath(content, payload, user, 'update')
                        }
                    }

                    payload = {
                        ...(thumbPath ? { thumbPath: thumbPath } : {}),
                        ...(contentPath ? { contentPath: contentPath } : {}),
                        ...(bannerPath ? { bannerPath: bannerPath } : {}),
                        ...payload,
                    }

                    delete payload.content
                    delete payload.thumb
                    delete payload.banner

                    payload.author = user._id

                    if (payload.kind === 'SCORMItem' && content) {
                        const { contentPath } = await ItemModel.findById(payload._id)
                        await ItemModel.findByIdAndUpdate(payload._id, payload)
                        await ItemModel.findByIdAndUpdate(payload._id, { contentPath })
                    } else {
                        await ItemModel.findByIdAndUpdate(payload._id, payload)
                    }

                    _messages.success(res, req, 'Atualizado com sucesso')
                } catch (error) {
                    console.log(error)
                    if (error.name === 'ValidationError') {
                        const messages = {}
                        for (const k in error.errors) messages[k] = error.errors[k].message
                        _messages.badRequest(res, req, error, { name: error.name, messages }, 'items', 'update')
                    } else {
                        _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'items', 'update')
                    }
                }
            } else {
                _messages.badRequest(res, req, 'Já existe um item com esse título!', 'Já existe um item com esse título!', 'items', 'update')
            }
        }
    },

    async updateById (req, res) {
        const ItemModel = ITEM_KINDS[req.body.kind] || Item

        try {
            const _id = req.params.itemId
            await ItemModel.findOneAndUpdate({ _id }, req.body)
            res.status(httpStatus.NO_CONTENT).send()
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'items', 'updateById')
        }
    },

    async updateStatus (req, res) {
        try {
            const { _id, enabled } = req.body
            const item = await Item.findOne({ _id })

            if (item.title && item.description && item.durationHours) {
                await Item.findByIdAndUpdate(_id, { enabled })
                _messages.success(res, req, 'Atualizado com sucesso')
            } else {
                _messages.badRequest(res, req, 'Por favor, preencha os campos obrigatórios antes de ativar o item', 'Por favor, preencha os campos obrigatórios antes de ativar o item')
            }
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'items', 'updateById')
        }
    },

    async findItemTrails (req, res) {
        try {
            const _id = req.params.itemId
            const trails = await Trail.find({ 'items.itemID': { $in: _id } }, 'title')
            _messages.success(res, req, trails)
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'items', 'fintItemTrails')
        }
    },

    async disableById (req, res) {
        ItemController.updateById({ ...req, body: { enabled: false } }, res)
    },

    async findById (req, res) {
        try {
            const _id = req.params.itemId
            const item = await Item.findOne({ _id })
            _messages.success(res, req, item)
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'items', 'findById')
        }
    },

    async findItemById (req, res) {
        try {
            const itemId = req.params.itemId
            const trailId = req.params.trailId
            const userId = _functions.getUserByToken(req)

            const tags = await getTagsElegiblesByToken(req)
            const trail = await Trail.findOne({ _id: trailId })

            // Validação de eligibilidade do item.
            const tagNames = tags.map(x => x.display.toUpperCase())
            const trailTagNames = trail.tags.map(x => x.display.toUpperCase())

            let isEligible = false
            for (const tagTrilha of trailTagNames) {
                if (tagNames.includes(tagTrilha)) {
                    isEligible = true
                    break
                }
            }

            if (!isEligible) {
                _messages.success(res, req, {
                    error: true,
                    message: 'Este curso não está disponível para você',
                })
                return
            }

            const item = await Item.findOne({ _id: itemId })

            const isEnabled = (item.deleted == 0 && item.enabled)
            if (!isEnabled) {
                _messages.success(res, req, {
                    error: true,
                    message: 'Curso desabilitado ou removido',
                })
                return
            }

            const today = momentz()
            const startDate = momentz(trail.startDate)
            const endDate = momentz(trail.endDate)

            const isDateValid =
                today.diff(startDate, 'days') >= 0 &&
                today.diff(endDate, 'days') <= 0

            if (!isDateValid) {
                _messages.success(res, req, {
                    error: true,
                    message: 'Curso ainda não começou ou está vencido',
                })
                return
            }

            _messages.success(res, req, item)
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'items', 'findItemById')
        }
    },

    async createDocument (req, res) {
        req.body.kind = 'DocumentItem'
        ItemController.create(req, res)
    },

    async multiUploadDocument (req, res) {
        req.body.kind = 'DocumentItem'
        ItemController.multiUploadCreate(req, res)
    },

    async createMedia (req, res) {
        req.body.kind = 'MediaItem'
        ItemController.create(req, res)
    },

    async multiUploadMedia (req, res) {
        req.body.kind = 'MediaItem'
        ItemController.multiUploadCreate(req, res)
    },

    async uploadSCORM (req, res) {
        const user = await getUserByToken(req)
        if (req.method !== 'POST') {
            return res.status(httpStatus.NOT_FOUND).send()
        }

        if (!req.is('multipart/form-data')) {
            return res.status(httpStatus.NOT_ACCEPTABLE).send()
        }

        try {
            const packageId = new mongoose.Types.ObjectId()

            const busboy = new Busboy({
                headers: req.headers,
                limits: {
                    fields: 0,
                    files: 1,
                },
            })

            let manifestP = null
            const filesP = []
            const contentP = new Promise((resolve, reject) => {
                busboy.on('file', function (field, file, filename, encoding, mimetype) {
                    if (field !== 'content') return

                    file
                        .pipe(unzipper.Parse())
                        .on('error', function (err) {
                            error('unzipper error: %s', err)

                            if (/invalid\s+signature/i.test(err.message)) {
                                reject(_errors.SCORM_UPLOAD.INVALID_PACKAGE)
                            } else {
                                reject(err)
                            }
                        })
                        .on('finish', resolve)
                        .pipe(etl.map(async entry => {
                            if (isSCORMSchemaFile(entry.path) || entry.type === 'Directory') {
                                filesP.push(entry.autodrain().promise())
                                return
                            }

                            if (isSCORMManifestFile(entry.path)) {
                                manifestP = entry.buffer()
                                return
                            }

                            // filesP.push(awsAmazon(entry, `scorm/${packageId}`))
                            filesP.push(azureBlob(entry, `scorm/${packageId}`))
                        }))
                })
                    .on('error', reject)
            })
            req.pipe(busboy)

            await Promise.all([
                ...filesP,
                contentP,
            ])

            if (!manifestP) {
                throw _errors.SCORM_UPLOAD.NO_MANIFEST
            }

            try {
                const manifest = (await manifestP).toString()
                const $doc = parseXml(manifest)
                const $manifest = $doc.children[0]
                const $orgs = $manifest.children.find(el => el.name === 'organizations')
                if (!$orgs) return _messages.success(res, req, [])

                const defaultOrg = $orgs.attributes.default
                if (!defaultOrg) return _messages.success(res, req, [])

                const $org = $orgs.children.find(el =>
                    el.name === 'organization' &&
                    el.attributes.identifier === defaultOrg,
                )

                if (!$org) return _messages.success(res, req, [])

                const itemReducer = pipe(
                    filter(el => el.type === 'element' && el.name === 'item'),
                    reduce((items, item) => [...items, item, ...itemReducer(item.children)], []),
                )

                const $items = itemReducer($org.children)
                if (!$items.length) return _messages.success(res, req, [])

                const $resources = $manifest.children.find(el => el.name === 'resources')

                const items = await Promise.all($items.map($item => {
                    const $resource = $resources.children.find(el =>
                        el.name === 'resource' &&
                        el.attributes.identifier === $item.attributes.identifierref,
                    )
                    const $title = $item.children.find(el => el.name === 'title')

                    const title = $title && $title.children[0].text
                    const href = $resource.attributes.href
                    const scoId = $item.attributes.identifier

                    return SCORMItem.create({
                        author: user._id,
                        title,
                        packageId,
                        scoId,
                        contentPath: `${packageId}/${href}`,
                    })
                }))

                _messages.success(res, req, items)
            } catch (err) {
                throw _errors.SCORM_UPLOAD.INVALID_MANIFEST
            }
        } catch (err) {
            if (err.code === _errors.SCORM_UPLOAD.INVALID_PACKAGE.code) {
                res.status(httpStatus.UNPROCESSABLE_ENTITY).send(err)
            } else {
                _messages.badRequest(res, req, err, { code: err.code, message: err.message }, 'Bad Request', 'items', 'uploadSCORM')
            }
        }
    },

    async updateSCORM (req, res) {
        if (req.method !== 'PUT') {
            return res.status(httpStatus.NOT_FOUND).send()
        }

        if (!req.is('multipart/form-data')) {
            return res.status(httpStatus.NOT_ACCEPTABLE).send()
        }

        try {
            const _id = req.params.itemId
            let { packageId } = await Item.findOne({ _id }, 'packageId')
            const { contentPath } = await SCORMItem.findOne({ _id }, 'contentPath')
            const contentPathExplode = contentPath.split('/')
            const explodeUrl = contentPathExplode[0].split('_')

            if (!explodeUrl[1]) {
                packageId = packageId + '_1'
            } else {
                const version = parseInt(explodeUrl[1]) + 1
                packageId = packageId + `_${version}`
            }

            const busboy = new Busboy({
                headers: req.headers,
                limits: {
                    fields: 0,
                    files: 1,
                },
            })

            const filesP = []
            const contentP = new Promise((resolve, reject) => {
                busboy.on('file', function (field, file, filename, encoding, mimetype) {
                    if (field !== 'content') return

                    file
                        .pipe(unzipper.Parse())
                        .on('error', function (err) {
                            error('unzipper error: %s', err)

                            if (/invalid\s+signature/i.test(err.message)) {
                                reject(_errors.SCORM_UPLOAD.INVALID_PACKAGE)
                            } else {
                                reject(err)
                            }
                        })
                        .on('finish', resolve)
                        .pipe(etl.map(async entry => {
                            if (isSCORMSchemaFile(entry.path) || isSCORMManifestFile(entry.path)) {
                                filesP.push(entry.autodrain().promise())
                                return
                            }

                            // filesP.push(awsAmazon(entry, `scorm/${packageId}`))
                            filesP.push(azureBlob(entry, `scorm/${packageId}`))
                        }))
                })
                    .on('error', reject)
            })
            req.pipe(busboy)

            await Promise.all([
                ...filesP,
                contentP,
            ])

            await SCORMItem.findByIdAndUpdate(_id, { contentPath: `${packageId}/${contentPathExplode[1]}` })

            res.status(httpStatus.NO_CONTENT).send()
        } catch (err) {
            if (err.code === _errors.SCORM_UPLOAD.INVALID_PACKAGE.code) {
                res.status(httpStatus.UNPROCESSABLE_ENTITY).send(err)
            } else {
                _messages.badRequest(res, req, err, { code: err.code, message: err.message }, 'Bad Request', 'items', 'updateSCORM')
            }
        }
    },

    async findAll (req, res) {
        try {
            const { skip, limit } = _functions.pagination(req)
            const { sort, order } = _functions.ordernation(req)

            const q = {}
            if (req.query.enabled !== undefined) q.enabled = true
            const searchBy = req.query.searchBy
            let total = await Item.count(q)
            let itens = await Item.find(searchBy ? {
                $or: [
                    { description: { $regex: searchBy, $options: 'i' } },
                    { title: { $regex: searchBy, $options: 'i' } },
                ],
                deleted: { $eq: 0 },
            } : {
                deleted: { $eq: 0 },
            })
                .populate('idEvaluation', ['description'])
                .skip(parseInt(skip))
                .limit(parseInt(limit))
                .sort({ [order]: sort })

            if (req.query.filterNotRelated === 'true') {
                const dataItens = []
                const filterItens = await Item.find(searchBy ? {
                    $or: [
                        { description: { $regex: searchBy, $options: 'i' } },
                        { title: { $regex: searchBy, $options: 'i' } },
                    ],
                    deleted: { $eq: 0 },
                } : {
                    deleted: { $eq: 0 },
                })

                await Promise.all(filterItens.map(async item => {
                    const trail = await Trail.find({
                        'items.itemID': { $in: item._id },
                    }).countDocuments()

                    if (trail !== 0) dataItens.push(item)
                }))

                total = dataItens.length
                itens = dataItens.slice(parseInt(skip)).slice(0, parseInt(limit))
            }

            _messages.success(res, req, {
                total,
                data: itens,
            })
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'items', 'findAll')
        }
    },

    async findItensActives (req, res) {
        try {
            const itens = await Item.find({
                enabled: { $eq: true },
                deleted: { $eq: 0 },
            })
            _messages.success(res, req, itens)
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'items', 'findItensActives')
        }
    },

    async generateCertificate (req, res) {
        try {
            const { item } = req.params
            const user = await _functions.getUserByToken(req)
            const course = await Item.findById(item)
            const tracking = await Tracking.findOne({
                item: { $eq: item },
                userLogin: user.networkLogin,
            })

            if (tracking.completion === 1) {
                const certificate = {
                    name: user.name,
                    course: course.title,
                    date: _functions.getDateTodayExtensive(),
                    workload: _functions.convertMinutesToHours(course.durationHours),
                }
                _messages.success(res, req, certificate)
            } else {
                _messages.badRequest(res, req, 'Não foi possível gerar o certificado, pois o item não está concluído!', 'Conclua o item para gerar o certificado!', 'items', 'generateCertificate')
            }
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'items', 'generateCertificate')
        }
    },
}

module.exports = ItemController
