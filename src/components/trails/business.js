const {
    formatDateWithoutHours,
    getDateTodayWithoutHours,
} = require('../../utils/functions');

const { Trail } = require('./model');
const { Item } = require('../items/model');

module.exports = {
    async checkItem (item) {
        return new Promise((resolve, reject) => {
            const today = getDateTodayWithoutHours();
            const startDate = formatDateWithoutHours(item.startDate);
            const endDate = item.endDate
                ? formatDateWithoutHours(item.endDate)
                : 'Invalid Date';

            if (
                startDate <= today &&
                (endDate >= today || endDate === 'Invalid Date') &&
                item.enabled &&
                item.highlighted
            )
                resolve(true);
            resolve(false);
        });
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
    populateTrails (
        flag = true,
        findObj = {},
        sortObj = {},
        filterEnabled = true,
        match = {},
        skip = null,
        limit = null
    ) {
        return new Promise(async (resolve, reject) => {
            try {
                let trails = [];

                const matchObj = filterEnabled
                    ? {
                        ...match,
                        enabled: true,
                        deleted: 0,
                    }
                    : {
                        deleted: 0,
                    };
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
                                select: 'description',
                            },
                            select: 'title'
                        })
                        .sort(sortObj)
                        .skip(skip)
                        .limit(limit);
                } else {
                    trails = await Trail.find(findObj)
                        .populate({
                            path: 'author',
                        })
                        .populate({
                            path: 'items.itemID',
                            match: matchObj,
                            select: { '_id': 1, 'title': 1, 'contentPath': 1, 'durationHours': 1, 'thumbPath': 1, 'titleURL': 1, 'bannerPath': 1, 'startDate': 1, 'endDate': 1, 'highlighted': 1, 'description': 1 },
                            populate: {
                                path: 'idEvaluation',
                                select: 'description',
                            },
                        })
                        .sort(sortObj);
                }
                const arrTrails = [];
                if (!flag) {
                    for (const trail of trails) {
                        const arrItems = [];
                        for (const i of trail.items) {
                            const item = await Item.findById(i.itemID);
                            if (item !== null) arrItems.push(item);
                        }

                        let userName = '';
                        if (trail.author) {
                            userName = trail.author.name;
                        }

                        let supportMaterialEnabled = false;
                        const filteredSupportArray =
                            trail.supportMaterial.filter(
                                (x) => x.deleted === false
                            );
                        if (filteredSupportArray.length > 0) {
                            supportMaterialEnabled = true;
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
                            endDate: trail.endDate,
                            tags: trail.tags,
                            tagsAnd: trail.tagsAnd || null,
                            innerTextStatus: trail.innerTextStatus,
                            innerText: trail.innerText,
                            author: userName,
                            completion: trail.completion,
                            isSequenceEnabled: trail.isSequenceEnabled,
                            isPadletEnabled: trail.isPadletEnabled,
                            items: arrItems,
                            separators: trail.separators,
                            expirationType: trail.expirationType,
                            collaborative: trail.collaborative,
                            moderation: trail.moderation,
                            complaints: trail.complaints,
                            certificate: trail.certificate,
                            certificateDue: trail.certificateDue,
                            externalPlayer: trail.externalPlayer,
                            certificateLayout: trail.certificateLayout,
                            supportMaterialEnabled: supportMaterialEnabled,
                        });
                    }
                } else {
                    for (const trail of trails) {
                        const arrItems = [];
                        for (const i of trail.items) {
                            //const item = await Item.findById(i.itemID);
                            if (i?.itemID !== null) {
                                arrItems.push({
                                    urlItem: i.urlItem,
                                    urlTrail: i.urlTrail,
                                    itemID: i.itemID,
                                    mandatory: i.mandatory,
                                    chief: i.chief,
                                    optional: i.optional,
                                    afterSeparator: i.afterSeparator,
                                });
                            }
                        }

                        let userName = '';
                        if (trail.author) {
                            userName = trail.author.name;
                        }

                        let supportMaterialEnabled = false;
                        const filteredSupportArray =
                            trail.supportMaterial.filter(
                                (x) => x.deleted === false
                            );
                        if (filteredSupportArray.length > 0) {
                            supportMaterialEnabled = true;
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
                            tags: trail.tags,
                            tagsAnd: trail.tagsAnd || null,
                            completion: trail.completion,
                            isSequenceEnabled: trail.isSequenceEnabled,
                            isPadletEnabled: trail.isPadletEnabled,
                            items: arrItems,
                            separators: trail.separators,
                            innerTextStatus: trail.innerTextStatus,
                            innerText: trail.innerText,
                            author: userName,
                            expirationType: trail.expirationType,
                            collaborative: trail.collaborative,
                            moderation: trail.moderation,
                            complaints: trail.complaints,
                            certificate: trail.certificate,
                            certificateDue: trail.certificateDue,
                            externalPlayer: trail.externalPlayer,
                            certificateLayout: trail.certificateLayout,
                            supportMaterialEnabled: supportMaterialEnabled,
                        });
                    }
                }
                resolve(arrTrails);
            } catch (error) {
                reject(error);
            }
        });
    },

    async processTrailWorkload (trails) {
        try {
            return await Promise.all(trails.map(async (trail) => {
                const itensLength = trail.items.length;
                const workload = trail.items.reduce((accumulatorPromise, currentValue) => {
                    const accumulator = accumulatorPromise;
                    const durationHours = currentValue.itemID.enabled == 1 ? (currentValue.itemID.durationHours || 0) : 0;
                    return accumulator + durationHours;
                }, 0);
                return {
                    ...trail._doc,
                    itensLength,
                    workload
                };
            }));
        } catch (error) {
            throw new Error("Erro ao processar os dados: " + error.message);
        }
    }
};
