const { formatDateWithoutHours, getDateTodayWithoutHours, processTrailTracking } = require('../../utils/functions');

const { Trail } = require('./model');
const { Item } = require('../items/model');
const axios = require('axios');
const { socialApi } = require('../social/http-adapter');
const { getDbCurrentFeatures } = require('../../utils/features');
const { Tracking } = require('../tracking/model');

module.exports = {
    async checkItem(item) {
        return new Promise((resolve, reject) => {
            const today = getDateTodayWithoutHours();
            const startDate = formatDateWithoutHours(item.startDate);
            const endDate = item.endDate ? formatDateWithoutHours(item.endDate) : 'Invalid Date';

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
     * Populates and returns an array of trail objects with detailed information, including items, author, support materials, gallery status, social status, and other metadata.
     *
     * @async
     * @function populateTrails
     * @param {boolean} [flag=true] - Determines the population strategy for items (true for lean population, false for full item fetch). Prefer `true` for performance.
     * @param {Object} [findObj={}] - MongoDB query object to filter trails.
     * @param {Object} [sortObj={}] - MongoDB sort object to order trails.
     * @param {boolean} [filterEnabled=true] - If true, filters items to only include enabled and non-deleted ones.
     * @param {Object} [match={}] - MongoDB query object to filter items.
     * @param {number|null} [skip=null] - Number of trails to skip (for pagination).
     * @param {number|null} [limit=null] - Maximum number of trails to return (for pagination).
     * @returns {Promise<Array<Object>>} Array of populated trail objects with metadata, items, author, and status fields.
     */
    async populateTrails(
        flag = true,
        findObj = {},
        sortObj = {},
        filterEnabled = true,
        match = {},
        skip = null,
        limit = null
    ) {
        let socialConfig;

        const features = await getDbCurrentFeatures();

        if (features?.social) {
            const { data } = await socialApi.get(`client-config/${process.env.CLIENT_ID}`);
            socialConfig = data;
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

        const trailQuery = Trail.find(findObj)
            .populate({
                path: 'author',
            })
            .populate({
                path: 'items.itemID',
                match: matchObj,
                select: {
                    _id: 1,
                    title: 1,
                    contentPath: 1,
                    durationHours: 1,
                    thumbPath: 1,
                    titleURL: 1,
                    bannerPath: 1,
                    startDate: 1,
                    endDate: 1,
                    highlighted: 1,
                    description: 1,
                    format: 1,
                    passingScore: 1,
                    enabled: 1,
                },
                populate: {
                    path: 'idEvaluation',
                    select: 'description',
                },
            })
            .sort(sortObj);

        if (skip !== null) {
            trailQuery.skip(skip);
        }

        if (limit !== null) {
            trailQuery.limit(limit);
        }
        
        const trails = await trailQuery.lean();

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
                const filteredSupportArray = trail.supportMaterial.filter(
                    (x) => x.deleted === false
                );
                if (filteredSupportArray.length > 0) {
                    supportMaterialEnabled = true;
                }

                let galleryEnabled = false;
                const filteredGallery = trail.gallery.filter((x) => x.deleted === false);
                if (filteredGallery.length > 0) {
                    galleryEnabled = true;
                }

                if (socialConfig) {
                    const trailTags = trail.tags?.map((tag) => tag.value);
                    for (const tag of socialConfig.tagsLists.allowed) {
                        if (trailTags?.includes(tag)) {
                            socialStatus = 'ALLOWED';
                        }
                    }

                    for (const tag of socialConfig.tagsLists.blocked) {
                        if (trailTags?.includes(tag)) {
                            socialStatus = 'BLOCKED';
                        }
                    }

                    for (const tag of socialConfig.tagsLists.moderated) {
                        if (trailTags?.includes(tag)) {
                            socialStatus = 'MODERATED';
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
                    createdAt: trail.createdAt,
                });
            }
        } else {
            for (const trail of trails) {
                const arrItems = trail.items.filter(i => i?.itemID);

                const userName = trail?.author?.name || '';

                let supportMaterialEnabled = false;
                const filteredSupportArray = trail.supportMaterial?.filter(
                    (x) => x.deleted === false
                ) || [];

                if (filteredSupportArray.length > 0) {
                    supportMaterialEnabled = true;
                }

                let galleryEnabled = false;

                const filteredGallery = trail.gallery?.filter((x) => x.deleted === false) ?? [];
                if (filteredGallery.length > 0) {
                    galleryEnabled = true;
                }

                let socialStatus = '';

                if (socialConfig) {
                    const trailTags = trail.tags?.map((tag) => tag.value);
                    for (const tag of socialConfig.tagsLists.allowed) {
                        if (trailTags?.includes(tag)) {
                            socialStatus = 'ALLOWED';
                        }
                    }

                    for (const tag of socialConfig.tagsLists.blocked) {
                        if (trailTags?.includes(tag)) {
                            socialStatus = 'BLOCKED';
                        }
                    }

                    for (const tag of socialConfig.tagsLists.moderated) {
                        if (trailTags?.includes(tag)) {
                            socialStatus = 'MODERATED';
                        }
                    }
                }

                trail.durationHours = arrItems.reduce((acc, item) => {
                    const itemDuration = item.itemID?.durationHours || 0;
                    return acc + itemDuration;
                }, 0);

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
                    createdAt: trail.createdAt,
                });
            }
        }

        return arrTrails;
    },

    async processTrailWorkload(trails) {
        try {
            return await Promise.all(
                trails.map(async (trail) => {
                    const itensLength = trail.items.length;
                    const workload = trail.items.reduce((accumulatorPromise, currentValue) => {
                        const accumulator = accumulatorPromise;
                        const durationHours =
                            currentValue.itemID?.enabled == 1
                                ? currentValue.itemID.durationHours || 0
                                : 0;
                        return accumulator + durationHours;
                    }, 0);
                    return {
                        ...trail._doc,
                        itensLength,
                        workload,
                    };
                })
            );
        } catch (error) {
            throw new Error('Erro ao processar os dados: ' + error.message);
        }
    },

    async searchTrailBy(searchBy, tags) {
        const query = {
            enabled: true,
            archive: { $ne: true },
            //owner:
        };

        if (searchBy) {
            query.$or = [
                { title: { $regex: searchBy, $options: 'i' } },
                { description: { $regex: searchBy, $options: 'i' } },
            ];
        }

        if (tags.length > 0) {
            query['tags.value'] = { $in: tags?.map((tag) => tag?.value) };
        }

        return await Trail.find(query, 'title description').limit(10);
    },

    async getTrailByIds(trailIds) {
        return await Trail.find({ _id: { $in: trailIds } }, 'title thumbPath _id').lean()
    },

    async getTrailsWithTrackings(trailIds, userNetworkLogin) {
        const trails = await Trail.find({ _id: { $in: trailIds } }, 'title thumbPath _id items').lean()

        const query = {
            userLogin: userNetworkLogin,
            item: { $in: trails?.flatMap((trail) => trail.items?.map((item) => item.itemID)) },
        };

        const allTrackings = await Tracking.find(query);

        for (const trail of trails) {
            processTrailTracking(trail, allTrackings);
        }

        return trails.map((t) => {
            let status = 'pending';
            switch (t.completionPercentage) {
                case 1:
                    status = 'completed';
                    break;
                case 0:
                    status = 'pending';
                    break;
                default:
                    status = 'inProgress';
                    break;
            }
            return {
                _id: t._id,
                title: t.title,
                thumbPath: t.thumbPath,
                status,
            }
        })
    }
};
