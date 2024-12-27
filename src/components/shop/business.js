const formidable = require('express-formidable');
const { isSegmentationException } = require('../config/business');
const { azureBlob } = require('../../utils/files');

const ApiError = require('../../errors/ApiError');

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

async function handleShopRequest(promise, res) {
    try {
        const response = await promise;

        const { data, status } = response;

        return res.status(status)
            .json(
                data && data !== ''
                    ? data
                    : { ok: true }
            )
    } catch (error) {
        throw new ApiError(
            error.response?.data?.message ?? 'Internal Server Error',
            error.response?.status ?? 500,
            error.response?.data ?? { message: error.message, stack: error.stack },
            { skipDbLog: error.response?.status === 400 }
        );
    }
}

async function jsonOrFormData(req, res, next) {
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
    getDynamicRequestProps,
    handleShopRequest,
    jsonOrFormData,
    parseProductBodyAndUploadImages,
    parseCategoryBodyAndUploadImages,
}