const {
    formatDateWithoutHours,
    getDateTodayWithoutHours,
} = require('../../utils/functions')

const { Trail } = require('./model')
const { Item } = require('../items/model')

module.exports = {
    async checkItem (item) {
        return new Promise((resolve, reject) => {
            const today = getDateTodayWithoutHours()
            const startDate = formatDateWithoutHours(item.startDate)
            const endDate = item.endDate ? formatDateWithoutHours(item.endDate) : 'Invalid Date'

            if (startDate <= today && (endDate >= today || endDate === 'Invalid Date') && item.enabled && item.highlighted) resolve(true)
            resolve(false)
        })
    },

    /**
     * Popula os itens de uma trilha.
     * @param {*} flag Caso a flag seja "true" popula o item com a relações com a trilha.
     * @param {*} findObj Objeto que o mongo usa para pesquisar
     * @param {*} sortObj Objeto que o mongo usa para ordenar
     * @param {*} skip
     * @param {*} limit
     * @param {boolean} filterEnabled Flag que indica se deve filtrar por habilitado ou não. (Padrão: true)
     */
    populateTrails (flag = true, findObj = {}, sortObj = {}, filterEnabled = true, match = {}, skip = null, limit = null) {
        return new Promise(async (resolve, reject) => {
            try {
                let trails = []

                const matchObj = filterEnabled ? {
                    ...match,
                    enabled: true,
                    deleted: 0,
                } : {
                    deleted: 0,
                }
                if (skip !== null) {
                    trails = await Trail.find(findObj)
                        .populate({
                            path: 'author',
                        })
                        .populate({
                            path: 'items.itemID',
                            match: matchObj,
                            populate: {
                                path: 'idEvaluation',
                                select: 'description'
                            }
                        })
                        .sort(sortObj)
                        .skip(skip)
                        .limit(limit)
                } else {
                    trails = await Trail.find(findObj).populate({
                        path: 'author',
                    }).populate({
                        path: 'items.itemID',
                        match: matchObj,
                        populate: {
                            path: 'idEvaluation',
                            select: 'description'
                        }
                    }).sort(sortObj)
                }
                const arrTrails = []
                if (!flag) {
                    for (const trail of trails) {
                        const arrItems = []
                        for (const i of trail.items) {
                            const item = await Item.findById(i.itemID)
                            if (item !== null) arrItems.push(item)
                        }

                        let userName = ''
                        if (trail.author) {
                            userName = trail.author.name
                        }

                        arrTrails.push({
                            _id: trail._id,
                            enabled: trail.enabled,
                            title: trail.title,
                            titleURL: trail.titleURL,
                            description: trail.description,
                            mandatory: trail.mandatory,
                            highlighted: trail.highlighted,
                            thumbPath: trail.thumbPath,
                            backgroundPath: trail.backgroundPath,
                            bannerPath: trail.bannerPath,
                            startDate: trail.startDate,
                            createdAt: trail.createdAt,
                            updatedAt: trail.updatedAt,
                            endDate: trail.endDate,
                            tags: trail.tags,
                            innerTextStatus: trail.innerTextStatus,
                            innerText: trail.innerText,
                            author: userName,
                            completion: trail.completion,
                            isSequenceEnabled: trail.isSequenceEnabled,
                            items: arrItems,
                            expirationType: trail.expirationType,
                            collaborative: trail.collaborative,
                            moderation: trail.moderation,
                            complaints: trail.complaints,
                            certificate: trail.certificate,
                            externalPlayer: trail.externalPlayer,
                            certificateLayout: trail.certificateLayout,
                        })
                    }
                } else {
                    for (const trail of trails) {
                        const arrItems = []
                        for (const i of trail.items) {
                            const item = await Item.findById(i.itemID)
                            if (item !== null) {
                                arrItems.push({
                                    urlItem: i.urlItem,
                                    urlTrail: i.urlTrail,
                                    itemID: i.itemID,
                                    mandatory: i.mandatory,
                                })
                            }
                        }

                        let userName = ''
                        if (trail.author) {
                            userName = trail.author.name
                        }

                        arrTrails.push({
                            _id: trail._id,
                            enabled: trail.enabled,
                            title: trail.title,
                            titleURL: trail.titleURL,
                            description: trail.description,
                            mandatory: trail.mandatory,
                            highlighted: trail.highlighted,
                            thumbPath: trail.thumbPath,
                            bannerPath: trail.bannerPath,
                            backgroundPath: trail.backgroundPath,
                            startDate: trail.startDate,
                            endDate: trail.endDate,
                            createdAt: trail.createdAt,
                            updatedAt: trail.updatedAt,
                            tags: trail.tags,
                            completion: trail.completion,
                            isSequenceEnabled: trail.isSequenceEnabled,
                            items: arrItems,
                            innerTextStatus: trail.innerTextStatus,
                            innerText: trail.innerText,
                            author: userName,
                            expirationType: trail.expirationType,
                            collaborative: trail.collaborative,
                            moderation: trail.moderation,
                            complaints: trail.complaints,
                            certificate: trail.certificate,
                            externalPlayer: trail.externalPlayer,
                            certificateLayout: trail.certificateLayout,
                        })
                    }
                }
                resolve(arrTrails)
            } catch (error) {
                reject(error)
            }
        })
    },
}
