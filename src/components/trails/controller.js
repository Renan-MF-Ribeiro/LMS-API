require('dotenv').config()
const { TINCAN_OWNER, DOMAIN, AZURE_BLOB_URL } = process.env
const _messages = require('../../utils/messages')
const { awsAmazon, azureBlob } = require('../../utils/files')
const { isSCORMCompleted } = require('../../utils/functions')
const { Trail } = require('./model')
const { Item } = require('../items/model')
const { populateTrails } = require('../trails/business')
const { Tracking } = require('../tracking/model')
const {
    pagination,
    ordernation,
    getUserByToken,
    getTagsGroupsByToken,
    checksIfTheEndDateIsLessThanTheStartDate,
    getDateTodayWithoutHours,
    formatDateWithoutHours,
} = require('../../utils/functions')

const {
    checkItem,
} = require('./business')

const { Evaluation } = require('../assessments/model')

module.exports = {

    async getColaborativo (req, res) {
        try {
            const queryParams = req.query

            let trails = await populateTrails(true, { collaborative: true, queryParams }, { createdAt: -1 })
            trails = trails.map(trail => {
                trail = processTrailAndItems(trail)
                return prepareObject(trail)
            })

            _messages.success(res, req, trails)
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'trails', 'create')
        }
    },

    async create (req, res) {
        try {
            const trail = await Trail.create(req.body)
            _messages.success(res, req, { _id: trail._id }, 'Criação de dados', 'trails', 'create', trail, [], true, 'CREATE')
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'trails', 'create')
        }
    },

    async findById (req, res) {
        try {
            const _id = req.params.trailId
            const trail = await Trail
                .findOne({ _id })
            _messages.success(res, req, trail)
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'trails', 'findById')
        }
    },

    async multiUploadCreate (req, res) {
        try {
            const { thumb, banner, background } = req.files

            let payload = {}
            if (req.fields.payload) {
                try {
                    payload = JSON.parse(req.fields.payload)
                } catch { }
            }

            const flag = checksIfTheEndDateIsLessThanTheStartDate(payload.startDate, payload.endDate)
            if (!flag) {
                _messages.badRequest(res, req, 'A data final não pode ser menor que a data inicial!', 'A data final não pode ser menor que a data inicial!', 'items', 'multiUploadCreate')
            } else {
                const verify = await Trail
                    .find({
                        title: { $eq: payload.title },
                    })

                if (verify.length === 0) {
                    let thumbPath
                    let bannerPath
                    let backgroundPath
                    if (thumb) {
                        thumbPath = await azureBlob(thumb, 'trails/thumbs')
                        if (process.env.NODE_ENV !== 'local') {
                            thumbPath = thumbPath.replace(AZURE_BLOB_URL, DOMAIN)
                        }
                    }
                    if (banner) {
                        // bannerPath = await awsAmazon(banner, 'trails/banners')
                        bannerPath = await azureBlob(banner, 'trails/banners')
                    }

                    if (background) {
                        backgroundPath = await azureBlob(background, 'trails/backgrounds')
                        if (process.env.NODE_ENV !== 'local') {
                            backgroundPath = backgroundPath.replace(AZURE_BLOB_URL, DOMAIN)
                        }
                    }

                    payload = {
                        ...payload,
                        enabled: true,
                        thumbPath: thumbPath,
                        bannerPath: bannerPath,
                        backgroundPath,
                    }

                    const trail = await Trail.create(payload)
                    _messages.success(res, req, trail, 'Atualização de dados', 'trails', 'multiUploadCreate', trail, [], true, 'UPDATE')
                } else {
                    _messages.badRequest(res, req, 'Já existe um trilha cadastrada com esse título', 'Já existe um trilha cadastrada com esse título', 'trails', 'multiUploadCreate', '5d9f22722cefc7329473e5c5')
                }
            }
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'trails', 'multiUploadCreate')
        }
    },

    async changeStatus (req, res) {
        try {
            const { _id, enabled } = req.body

            if (!_id) {
                throw new Error('Did not pass _id')
            }

            if (enabled === null || enabled === undefined) {
                throw new Error('Did not pass enabled')
            }

            const oldData = await Trail.updateOne({ _id: { $eq: _id } }, { enabled: enabled })
            const newData = await Trail.find({ _id: { $eq: _id } })

            _messages.success(res, req, newData, 'Atualização de statud', 'trails', 'update', newData, oldData, true, 'UPDATE')
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'trails', 'change-status')
        }
    },

    async changeShowcase (req, res) {
        try {
            const { _id, showcase } = req.body

            if (!_id) {
                throw new Error('Did not pass _id')
            }

            if (showcase === null || showcase === undefined) {
                throw new Error('Did not pass showcase')
            }

            const oldData = await Trail.updateOne({ _id: { $eq: _id } }, { showcase: showcase })
            const newData = await Trail.find({ _id: { $eq: _id } })

            _messages.success(res, req, newData, 'Atualização de exibição na Vitrine', 'trails', 'update', newData, oldData, true, 'UPDATE')
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'trails', 'change-showcase')
        }
    },

    async update (req, res) {
        try {
            const { thumb, banner, background } = req.files
            const { _id } = JSON.parse(req.fields.payload)
            let { thumbPath, bannerPath, backgroundPath } = await Trail.findOne({ _id: { $eq: _id } })

            let payload = {}

            if (req.fields.payload) {
                try {
                    payload = JSON.parse(req.fields.payload)
                } catch { }
            }

            const flag = checksIfTheEndDateIsLessThanTheStartDate(payload.startDate, payload.endDate)
            if (!flag) {
                _messages.badRequest(res, req, 'A data final não pode ser menor que a data inicial!', 'A data final não pode ser menor que a data inicial!', 'items', 'multiUploadCreate')
            } else {
                const verify = await Trail
                    .find({
                        title: { $eq: payload.title },
                        _id: { $ne: _id },
                    })

                if (verify.length === 0) {
                    if (thumb) {
                        thumbPath = await azureBlob(thumb, 'trails/thumbs')
                        if (process.env.NODE_ENV !== 'local') {
                            thumbPath = thumbPath.replace(AZURE_BLOB_URL, DOMAIN)
                        }
                    }
                    if (banner) {
                        // bannerPath = await awsAmazon(banner, 'trails/banners')
                        bannerPath = await azureBlob(banner, 'trails/banners')
                    }

                    if (background) {
                        backgroundPath = await azureBlob(background, 'trails/backgrounds')
                        if (process.env.NODE_ENV !== 'local') {
                            backgroundPath = backgroundPath.replace(AZURE_BLOB_URL, DOMAIN)
                        }
                    } else {
                        backgroundPath = payload.backgroundPath ? payload.backgroundPath : null
                    }

                    delete payload.thumb
                    delete payload.banner

                    payload = {
                        ...payload,
                        thumbPath,
                        bannerPath,
                        backgroundPath,
                    }

                    const [trail] = await Trail.find({ _id: { $eq: payload._id } })

                    if (payload.mandatory.length == 0) {
                        // Setar todos os mandatory de itens como false.
                        trail.items.forEach(item => {
                            item.mandatory = false
                        })

                        payload.items = trail.items
                    };

                    const oldData = await Trail.updateOne({ _id: { $eq: payload._id } }, payload)
                    const newData = await Trail.find({ _id: { $eq: payload._id } })

                    _messages.success(res, req, trail, 'Atualização de dados', 'trails', 'update', newData, oldData, true, 'UPDATE')
                } else {
                    _messages.badRequest(res, req, 'Já existe um trilha cadastrada com esse título', 'Já existe um trilha cadastrada com esse título', 'trails', 'update', '5d9f22722cefc7329473e5c5')
                }
            }
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'trails', 'update')
        }
    },

    async linkItems (req, res) {
        try {
            let exist = false
            const { idItem, idTrail } = req.body
            const { items } = await Trail.findOne({
                _id: { $eq: idTrail },
            })
            let oldData
            let newData

            items.forEach(item => {
                if (item.itemID.toString() === idItem[0]) exist = true
            })

            if (!exist) {
                for (const i of idItem) {
                    const index = items.indexOf(i)
                    if (index === -1) {
                        items.push({
                            urlItem: `http://happmobi.com.br/${TINCAN_OWNER}/${idTrail}/${idItem}`,
                            urlTrail: `http://happmobi.com.br/${TINCAN_OWNER}/${idTrail}`,
                            itemID: i,
                        })
                        oldData = await Trail.findByIdAndUpdate(idTrail, { items })
                        newData = await Trail.find({ _id: { $eq: idTrail } })
                    }
                }

                _messages.success(res, req, 'Sucesso', 'Atualização de dados', 'trails', 'linkItems', newData, oldData, true, 'UPDATE')
            } else {
                _messages.badRequest(res, req, 'O item já está vinculado a esta trilha!', 'O item já está vinculado a esta trilha!', 'items', '/linkItems')
            }
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'trails', 'items')
        }
    },

    async findAll (req, res) {
        try {
            const { skip, limit } = pagination(req)
            const { order, sort } = ordernation(req)
            const searchBy = req.query.searchBy

            const total = await Trail.countDocuments()
            const trails = await Trail
                .find(searchBy ? {
                    $or: [
                        { description: { $regex: searchBy, $options: 'i' } },
                        { title: { $regex: searchBy, $options: 'i' } },
                    ],
                } : {})
                .sort({ [order]: sort })
                .skip(parseInt(skip))
                .limit(parseInt(limit))

            _messages.success(res, req, {
                data: trails,
                total,
            })
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'trails', 'findAll')
        }
    },

    async returnItemsByTrail (req, res) {
        try {
            const { skip, limit } = pagination(req)
            const { order, sort } = ordernation(req)
            const { id } = req.params
            const user = await getUserByToken(req)

            const total = await Trail.findOne({
                _id: { $eq: id },
            }, 'items')

            const trails = await populateTrails(true,
                {
                    _id: { $eq: id },
                },
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
                        item.completion = isSCORMCompleted(tracking.lessonStatus) ? 1 : 0
                    } else {
                        item.completion = tracking.completion
                    }
                }

                if (item.kind === 'ExamItem') {
                    const evaluation = await Evaluation.findById(item.idEvaluation)
                    if (evaluation) item.descriptionEvaluation = evaluation.description
                }
            }
            _messages.success(res, req, {
                data: items,
                total: total.items.length,
            })
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'trails', 'returnItemsByTrail')
        }
    },

    async returnItemsByTrailMenu (req, res) {
        try {
            const { id } = req.params
            const user = await getUserByToken(req)

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

            const trails = await populateTrails(true, {
                _id: { $eq: id },
            })

            const { items, isSequenceEnabled } = trails[0]

            for (const item of items) {
                const tracking = await Tracking.findOne({
                    item: { $eq: item.itemID._id },
                    userLogin: { $eq: user.networkLogin },
                })

                if (tracking) {
                    if (tracking.kind === 'SCORMTracking') {
                        item.completion = isSCORMCompleted(tracking.lessonStatus) ? 1 : 0
                    } else {
                        item.completion = tracking.completion
                    }
                }

                if (item.kind === 'ExamItem') {
                    const evaluation = await Evaluation.findById(item.idEvaluation)
                    if (evaluation) item.descriptionEvaluation = evaluation.description
                }
            }
            _messages.success(res, req, {
                data: items,
                isSequenceEnabled: isSequenceEnabled,
            })
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'trails', 'returnItemsByTrail')
        }
    },

    async unlinkItems (req, res) {
        try {
            const { idItem, idTrail } = req.body
            const { items } = await Trail.findOne({
                _id: { $eq: idTrail },
            }, 'items')

            for (const i in items) {
                if (items[i] && (items[i].itemID.toString() === idItem)) {
                    delete items[i]
                }
            }

            const arrItens = items.filter(val => {
                return val !== null
            })

            const oldData = await Trail.findByIdAndUpdate(idTrail, { items: arrItens })
            const newData = await Trail.find({ _id: { $eq: idTrail } })

            _messages.success(res, req, 'Sucesso', 'Atualização de dados', 'trails', 'unlinkItems', newData, oldData, true, 'UPDATE')
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'trails', 'unlinkItems')
        }
    },

    async changeItemOrderFromTrail (req, res) {
        try {
            const { idTrail, itemsInOrder } = req.body

            const { items } = await Trail.findOne({
                _id: { $eq: idTrail },
            }, 'items')

            // Valida os ids.
            const hasAllItems = items.length == itemsInOrder.length && itemsInOrder.reduce((hasAllItems, val) => {
                if (hasAllItems == false) {
                    return false
                }

                return (items.findIndex(i => val == i.itemID.toString()) >= 0)
            }, true)

            if (hasAllItems) {
                // Atualiza lista de items.
                const newTrailItems = itemsInOrder.map(idItem => {
                    const item = items.find(i => i.itemID.toString() === idItem)
                    if (!item) {
                        throw new Error(`item with id ${idItem} not found in items array`)
                    }

                    return item
                })
                const oldData = await Trail.findByIdAndUpdate(idTrail, { items: newTrailItems })
                const newData = await Trail.find({ _id: { $eq: idTrail } })

                _messages.success(res, req, 'Sucesso', 'Atualização da ordem dos items', 'trails', 'changeItemOrderFromTrail', newData, oldData, true, 'UPDATE')
            } else {
                _messages.badRequest(res, req, 'Não tem todos os items vinculados a trilha', 'Não tem todos os items vinculados a trilha', 'trails', 'changeItemOrderFromTrail')
            }
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'trails', 'unlinkItems')
        }
    },

    async returnBannersElegibles_new (req, res) {
        // # Nova versão para retornar banner, para melhorar a performance
        try {
            var dtInicio = new Date()

            const user = await getUserByToken(req)
            const tags = await getTagsGroupsByToken(req)
            let banners = []
            const itemsIDProcessados = []

            for (const tag of user.tags) {
                delete tag.createdAt
                tags.push(tag)
            }

            const items = await Item.find({
                enabled: true,
                highlighted: true,
                startDate: { $lt: getDateTodayWithoutHours() },
                endDate: { $gt: getDateTodayWithoutHours() },
            })

            const arrItemsID = []
            for (const item of items) {
                arrItemsID.push(String(item._id))
            }

            const trails = await populateTrails(false, {
                enabled: true,
                $or: [
                    { tags: { $in: tags } },
                    { mandatory: { $in: tags } },
                ],
                'items.itemID': { $in: arrItemsID },
            },
            { createdAt: 'desc' },
            false,
            { highlighted: true },
            )

            // console.log('trilhas ' + trails.length)
            // console.log(trails)

            for (const trail of trails) {
                for (const item of trail.items) {
                    // if (itemsIDProcessados.indexOf(item.itemID) < 0 && arrItemsID.indexOf(String(item.itemID)) > -1) {
                    banners.push({
                        itemID: item.itemID,
                        trailID: trail._id.toString(),
                        bannerPath: item.bannerPath || null,
                        startDate: formatDateWithoutHours(item.startDate),
                    })

                    itemsIDProcessados.push(item.itemID)
                    // }
                }
            }

            // console.log('banners > ' + banners.length)

            if (banners.length > 0) banners = banners.sort((a, b) => (a.startDate > b.startDate) ? -1 : 1)
            _messages.success(res, req, banners)
        } catch (error) {
            console.log(error)
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'trails', 'returnBannersElegibles')
        }
    },

    async returnBannersElegibles (req, res) {
        try {
            var dtInicio = new Date()

            const user = await getUserByToken(req)
            const tags = await getTagsGroupsByToken(req)
            let banners = []
            const itemsID = []
            for (const tag of user.tags) {
                delete tag.createdAt
                tags.push(tag)
            }

            const trails = await populateTrails(false, {
                enabled: true,
                $or: [
                    { tags: { $in: tags } },
                    { mandatory: { $in: tags } },
                ],

            },
            { createdAt: 'desc' },
            false,
            { highlighted: true },
            )

            for (const trail of trails) {
                for (const item of trail.items) {
                    const flag = await checkItem(item)
                    if (flag && itemsID.indexOf(item.id) < 0) {
                        banners.push({
                            itemID: item.id,
                            trailID: trail._id.toString(),
                            bannerPath: item.bannerPath || null,
                            startDate: formatDateWithoutHours(item.startDate),
                        })
                        itemsID.push(item.id)
                    }
                }
            }

            if (banners.length > 0) banners = banners.sort((a, b) => (a.startDate > b.startDate) ? -1 : 1)
            _messages.success(res, req, banners)
        } catch (error) {
            console.log(error)
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'trails', 'returnBannersElegibles')
        }
    },

    async returnTrailsByIDS (req, res) {
        try {
            const { trailsIDS } = req.body
            const arrTrails = []

            for (const t of trailsIDS) {
                const trail = await Trail.findById(t, ['title', 'description'])
                arrTrails.push(trail)
            }

            _messages.success(res, req, arrTrails)
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'trails', 'returnTrailsByIDS')
        }
    },

    async returnLinkTrailByItem (idItem) {
        return new Promise(async (resolve, reject) => {
            try {
                const trails = await Trail.find({ 'items.itemID': idItem })
                const trail = trails[0]
                var item = null

                for (var tmpItem = 0; tmpItem < trail.items.length; tmpItem++) {
                    if (trail.items[tmpItem].itemID == idItem) {
                        item = trail.items[tmpItem]
                    }
                }

                resolve(item)
            } catch (error) {
                reject(error)
            }
        })
    },

    async mandatory (req, res) {
        try {
            const { idTrail, idItem, mandatory } = req.body
            const trail = await Trail.findById(idTrail)

            const items = trail.items

            const hasMandatory = trail.mandatory.length > 0

            if (!hasMandatory && mandatory === true) {
                _messages.badRequest(
                    res,
                    req,
                    'É necessário que a trilha contenha tags de obrigatoriedade para atribuir obrigatoriedade a um item.',
                    'É necessário que a trilha contenha tags de obrigatoriedade para atribuir obrigatoriedade a um item.')

                return
            }

            items.forEach(i => {
                if (i.itemID.toString() === idItem) i.mandatory = mandatory
            })

            await Trail.findByIdAndUpdate(idTrail, { items })

            _messages.success(res, req, 'Obrigatoriedade gravada com sucesso!')
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno no servidor', 'trails', 'mandatory')
        }
    },

    async xapi (req, res) {
        try {
            const trails = await Trail.find()

            for (const trail of trails) {
                const items = []

                if (!trail.items_new) {
                    for (const item of trail.items) {
                        items.push({
                            itemID: item._id,
                            urlTrail: `http://happmobi.com.br/${TINCAN_OWNER}/${trail.id}`,
                            urlItem: `http://happmobi.com.br/${TINCAN_OWNER}/${trail.id}/${item._id.toString()}`,
                            mandatory: false,
                        })
                    }

                    await Trail.findByIdAndUpdate(trail._id, { items_new: items })
                } else {
                    await Trail.findByIdAndUpdate(trail._id, { items: trail.items_new })
                    await Trail.findByIdAndUpdate(trail._id, { $unset: { items_new: 1 } })
                }
            }

            res.status(200).json(trails)
        } catch (error) {
            console.log(error)
            res.status(500).send('Erro interno no servidor!')
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
            const trailId = req.params.trailId
            const itemId = req.params.itemId

            const trail = await Trail.findById(trailId)
            const item = trail.items.find(i => i.itemID == itemId)

            if (!item) {
                throw new Error(`Não encontrou o item ${itemId} na trilha ${trailId}`)
            }

            const response = {
                urlItem: item.urlItem,
                urlTrail: item.urlTrail,
            }

            _messages.success(res, req, response)
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno do servidor', 'trails', 'getCourseInformation')
        }
    },

    async returnTrailsByUser(req,res){
        try {
            const { userId } = req.query
            let trails = await populateTrails(true, { author: { $eq: userId }})
            _messages.success(res, req, {trails})
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno do servidor')
        }
    },

    async updateModeration (req, res) {
        try {
            const { moderation, trailId } = req.body

            if (!moderation || !trailId) {
                _messages.badRequest(res, req, 'Payload inválido', { message: 'Payload inválido' })
            }
            await Trail.findByIdAndUpdate(trailId, { moderation })

            _messages.success(res, req, { message: 'Trilha atualizada' })
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno do servidor', 'trails', 'updateModeration')
        }
    },

    async saveComplaint (req, res) {
        try {
            const { reason, trailId } = req.body

            if (!reason) {
                _messages.badRequest(res, req, 'Payload inválido', { message: 'Payload inválido' })
            }
            await Trail.findByIdAndUpdate(trailId, { $push: { complaints: { reason } } })

            _messages.success(res, req, { message: 'Trilha atualizada' })
        } catch (error) {
            _messages.internalServer(res, req, error.message, 'Erro interno do servidor', 'trails', 'updateModeration')
        }
    },
}

function processTrailAndItems (trail) {
    let duration = 0
    for (const item of trail.items) {
        duration += item.itemID.durationHours
    }

    trail.items = trail.items.map(item => {
        return {
            _id: item._id,
            title: item.itemID.title,
            description: item.itemID.description,
            durationHours: item.itemID.durationHours,
        }
    })

    trail.duration = duration

    return trail
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
    }
}
