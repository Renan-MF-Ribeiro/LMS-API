const {
    formatDateWithoutHours,
    getDateTodayWithoutHours,
} = require('../../utils/functions');

const { Trail } = require('./model');
const { Item } = require('../items/model');
const axios = require('axios');
const { socialApi } = require('../social/http-adapter');
const { getDbCurrentFeatures } = require('../../utils/features');

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
                let socialConfig;
                let socialStatus = ""
                    
                const features = await getDbCurrentFeatures();

                if (features?.social) {
                    const { data } = await socialApi.get(`client-config/${process.env.CLIENT_ID}`);
                    socialConfig = data
                }


                const matchObj = filterEnabled
                    ? {
                        ...match,
                        enabled: true,
                        deleted: 0,
                    }
                    : {
                        deleted: 0,
                    };
                matchObj['kind'] = { $ne: 'PostItem' };
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
                            select: { '_id': 1, 'title': 1, 'contentPath': 1, 'durationHours': 1, 'thumbPath': 1, 'titleURL': 1, 'bannerPath': 1, 'startDate': 1, 'endDate': 1, 'highlighted': 1, 'description': 1, "format": 1, 'passingScore': 1, 'enabled': 1 },
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

                        let galleryEnabled = false;
                        const filteredGallery =
                            trail.gallery.filter(
                                (x) => x.deleted === false
                            );
                        if (filteredGallery.length > 0) {
                            galleryEnabled = true;
                        }

                        if (socialConfig) {
                            const trailTags = trail.tags?.map((tag) => tag.value)
                            for (const tag of socialConfig.tagsLists.allowed) {
                                if (trailTags?.includes(tag)) {
                                    socialStatus = "ALLOWED"
                                }
                            }

                            for (const tag of socialConfig.tagsLists.blocked) {
                                if (trailTags?.includes(tag)) {
                                    socialStatus = "BLOCKED"
                                }
                            }

                            for (const tag of socialConfig.tagsLists.moderated) {
                                if (trailTags?.includes(tag)) {
                                    socialStatus = "MODERATED"
                                }
                            }
                        }

                        let durationHours = 0;
                        for (const item of arrItems) {
                            durationHours += item.itemID.durationHours;
                        }
                        trail.durationHours = durationHours;

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
                            socialStatus: socialStatus || null,
                            innerTextBanner: trail.innerTextBanner,
                            durationHours: trail.durationHours,
                            post: trail.post,
                            gallery: galleryEnabled,
                            confidential: trail.confidential,
                            updatedAt: trail.updatedAt,
                            createdAt: trail.createdAt
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
                                    enabled: i.enabled,
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

                        let galleryEnabled = false;
                        const filteredGallery =
                            trail.gallery.filter(
                                (x) => x.deleted === false
                            );
                        if (filteredGallery.length > 0) {
                            galleryEnabled = true;
                        }

                        if (socialConfig) {
                            const trailTags = trail.tags?.map((tag) => tag.value)
                            for (const tag of socialConfig.tagsLists.allowed) {
                                if (trailTags?.includes(tag)) {
                                    socialStatus = "ALLOWED"
                                }
                            }

                            for (const tag of socialConfig.tagsLists.blocked) {
                                if (trailTags?.includes(tag)) {
                                    socialStatus = "BLOCKED"
                                }
                            }

                            for (const tag of socialConfig.tagsLists.moderated) {
                                if (trailTags?.includes(tag)) {
                                    socialStatus = "MODERATED"
                                }
                            }
                        }

                        let durationHours = 0;
                        for (const item of arrItems) {
                            durationHours += item.itemID.durationHours;
                        }
                        trail.durationHours = durationHours;

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
                            socialStatus: socialStatus || null,
                            innerTextBanner: trail.innerTextBanner,
                            durationHours: trail.durationHours,
                            post: trail.post,
                            gallery: galleryEnabled,
                            confidential: trail.confidential,
                            updatedAt: trail.updatedAt,
                            createdAt: trail.createdAt
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
                    const durationHours = currentValue.itemID?.enabled == 1 ? (currentValue.itemID.durationHours || 0) : 0;
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
