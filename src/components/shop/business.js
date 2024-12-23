const axios = require('axios');
const { isSegmentationException } = require('../config/business');
const formidable = require('express-formidable');
const { azureBlob } = require('../../utils/files');

const gamificationShopClient = axios.create({
    baseURL: `${process.env.API_GAMIFICATION}/shop`,
    headers: {
        'x-api-key': process.env.API_KEY_GAMIFICATION,
        'x-client-id': process.env.CLIENT_ID
    },
});

function getDynamicRequestProps(req) {
    const ownerFieldValue = !isSegmentationException(req.user, req.segmentation)
        ? (req.user?.[req.segmentation?.rule?.issuer] ?? null)
        : undefined;

    return {
        owner: ownerFieldValue ? [ownerFieldValue] : undefined,
        headers: {
            'x-user-id': req.user.networkLogin
        },
        params: {
            ...req.query,
            owner: ownerFieldValue ? [ownerFieldValue] : undefined,
            eligibilities: req.eligibilities ?? [],
        },
    };
}

function handleShopRequest(promise, res) {
    promise
        .then(({ data, status }) => res.status(status).json(data))
        .catch(({ response }) => res.status(response?.status ?? 500).json(response?.data ?? { error: 'Internal Server Error' }));
}

function jsonOrFormData(req, res, next) {
    if (req.is('json')) return next();
    return formidable({ multiples: true })(req, res, next);
};

async function parseProductBodyAndUploadImages(req) {
    const reqFields = req.fields?.payload;

    if (!reqFields) throw new Error('Invalid request');

    const reqFiles = Object.entries(req.files ?? []).map(([, file]) => file);

    const body = JSON.parse(reqFields);

    if (body.image) {
        const file = reqFiles.find(image => image.name === body.image);

        if (file) {
            body.image = await azureBlob(file, 'shop/products') ?? null;
        }
    }

    return body;
}

async function parseCategoryBodyAndUploadImages(req) {
    const reqFields = req.fields?.payload;

    if (!reqFields) throw new Error('Invalid request');

    const reqFiles = Object.entries(req.files ?? []).map(([, file]) => file);

    const body = JSON.parse(reqFields);

    if (body.thumb) {
        const file = reqFiles.find(image => image.name === body.thumb);

        if (file) {
            body.thumb = await azureBlob(file, 'shop/categories/thumbs') ?? null;
        }
    }

    if (body.banner) {
        const file = reqFiles.find(image => image.name === body.banner);

        if (file) {
            body.banner = await azureBlob(file, 'shop/categories/banners') ?? null;
        }
    }

    return body;
}

module.exports = {
    gamificationShopClient,
    getDynamicRequestProps,
    handleShopRequest,
    jsonOrFormData,
    parseProductBodyAndUploadImages,
    parseCategoryBodyAndUploadImages,
}